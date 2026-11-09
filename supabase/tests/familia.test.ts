// O link da família (sem login) só alcança a enquete e o envio de causos do próprio livro.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  abrirEnquete,
  ativarPlano,
  como,
  criarBanco,
  criarLinkFamilia,
  criarUsuario,
  tenta,
  vencerPlano,
} from "./banco";

let db: PGlite;
let ana: string; // responsável do livro A
let beto: string; // responsável do livro B
let livroA: string;
let livroB: string;
let enqueteA: { enquete: string; itens: string[] };
let enqueteB: { enquete: string; itens: string[] };

const tokenA = "v1_AAAAAAAAAAAAAAAAAAAAAA";
const tokenB = "v1_BBBBBBBBBBBBBBBBBBBBBB";
const tokenAutorA = "v1_autorAAAAAAAAAAAAAAAA";
const aparelho = (n: number) => String(n).padStart(36, "0");

const anon = <T>(fn: Parameters<typeof como<T>>[3]) => como(db, "anon", {}, fn);

async function pagina(token: string, ap = aparelho(1)) {
  return anon(async (tx) => {
    const r = await tx.query<{ p: Record<string, unknown> | null }>(
      `select public.familia_pagina($1, $2) as p`,
      [token, ap],
    );
    return r.rows[0].p;
  });
}

async function votar(token: string, ap: string, nome: string, itens: string[]) {
  return anon((tx) =>
    tenta(tx, `select public.familia_votar($1, $2, $3, $4::uuid[])`, [
      token,
      ap,
      nome,
      itens,
    ]),
  );
}

async function enviarCauso(
  token: string,
  campos: {
    nome?: string;
    texto?: string | null;
    audio?: string | null;
    consentimento?: boolean;
  } = {},
): Promise<
  { id: string; livro: string; audio_caminho: string | null } | { erro: string }
> {
  return anon(async (tx) => {
    await tx.exec("savepoint causo");
    try {
      const r = await tx.query<{
        r: { id: string; livro: string; audio_caminho: string | null };
      }>(
        `select public.familia_enviar_causo($1, $2, $3, $4, $5, 1::smallint) as r`,
        [
          token,
          campos.nome ?? "Ana",
          campos.texto === undefined
            ? "Conta da vez em Guarapari"
            : campos.texto,
          campos.audio ?? null,
          campos.consentimento ?? true,
        ],
      );
      await tx.exec("release savepoint causo");
      return r.rows[0].r;
    } catch (e) {
      await tx.exec("rollback to savepoint causo");
      return { erro: (e as Error).message };
    }
  });
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Jair");
  livroB = await ativarPlano(db, beto, "Maria");
  await criarLinkFamilia(db, livroA, ana, tokenA);
  await criarLinkFamilia(db, livroB, beto, tokenB);
  const { createHash } = await import("node:crypto");
  await db.query(
    `insert into public.author_access (book_id, token_hash) values ($1, $2)`,
    [livroA, createHash("sha256").update(tokenAutorA).digest("hex")],
  );
  enqueteA = await abrirEnquete(db, livroA, ana, [
    { texto: "Como era a casa da infância?" },
    { texto: "Como conheceu a vó?" },
    { texto: "Qual o primeiro emprego?" },
    { texto: "Qual a viagem inesquecível?" },
    { texto: "Qual o prato preferido?" },
    { texto: "Qual o maior susto?" },
  ]);
  enqueteB = await abrirEnquete(db, livroB, beto, [
    { texto: "Pergunta de B um" },
    { texto: "Pergunta de B dois" },
  ]);
});

afterAll(async () => {
  await db.close();
});

describe("página da família", () => {
  it("o token de A só mostra a enquete de A", async () => {
    const p = (await pagina(tokenA)) as {
      autor: string;
      aberto: boolean;
      votos_por_pessoa: number;
      enquete: { id: string; itens: { id: string }[] };
    };
    expect(p.autor).toBe("Jair");
    expect(p.aberto).toBe(true);
    expect(p.votos_por_pessoa).toBe(5);
    expect(p.enquete.id).toBe(enqueteA.enquete);
    expect(p.enquete.itens.map((i) => i.id)).toEqual(enqueteA.itens);
  });

  it.each([
    ["inválido", "v1_naoexisteNAOEXISTE000"],
    ["curto", "abc"],
    ["do autor", tokenAutorA],
  ])("token %s não abre nada", async (_, token) => {
    expect(await pagina(token)).toBeNull();
  });

  it("token revogado não abre nada, e o novo abre", async () => {
    const outro = await criarUsuario(db, "carla@exemplo.com");
    const livro = await ativarPlano(db, outro, "Zé");
    await criarLinkFamilia(db, livro, outro, "v1_velhoVELHOVELHOVELHO00");
    await criarLinkFamilia(db, livro, outro, "v1_novoNOVONOVONOVONOVO0");
    expect(await pagina("v1_velhoVELHOVELHOVELHO00")).toBeNull();
    expect(await pagina("v1_novoNOVONOVONOVONOVO0")).not.toBeNull();
  });
});

describe("votar", () => {
  it("vota, troca o conjunto e mantém o mesmo votante", async () => {
    const primeiro = await votar(
      tokenA,
      aparelho(10),
      "Ana",
      enqueteA.itens.slice(0, 3),
    );
    expect(primeiro).not.toHaveProperty("erro");
    const antes = await db.query<{ votante: string }>(
      `select distinct votante from public.poll_votes where poll_id = $1`,
      [enqueteA.enquete],
    );
    await votar(tokenA, aparelho(10), "Ana", [enqueteA.itens[4]]);
    const depois = await db.query<{ votante: string; poll_item_id: string }>(
      `select votante, poll_item_id from public.poll_votes where poll_id = $1`,
      [enqueteA.enquete],
    );
    expect(depois.rows).toEqual([
      { votante: antes.rows[0].votante, poll_item_id: enqueteA.itens[4] },
    ]);
  });

  it("devolve livro e votante para o evento", async () => {
    const r = await anon(async (tx) => {
      const q = await tx.query<{
        r: { votos: number; livro: string; votante: string };
      }>(`select public.familia_votar($1, $2, 'Bia', $3::uuid[]) as r`, [
        tokenA,
        aparelho(11),
        enqueteA.itens.slice(0, 2),
      ]);
      return q.rows[0].r;
    });
    expect(r.votos).toBe(2);
    expect(r.livro).toBe(livroA);
    expect(r.votante).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("outro aparelho é outro votante", async () => {
    await votar(tokenA, aparelho(12), "Caio", [enqueteA.itens[0]]);
    const r = await db.query<{ n: number }>(
      `select count(distinct votante)::int as n from public.poll_votes where poll_id = $1`,
      [enqueteA.enquete],
    );
    expect(r.rows[0].n).toBeGreaterThanOrEqual(3);
  });

  it("item de outro livro: item_invalido", async () => {
    expect(
      await votar(tokenA, aparelho(13), "Dani", [enqueteB.itens[0]]),
    ).toEqual({
      erro: "item_invalido",
    });
  });

  it("token de B com itens de A: item_invalido", async () => {
    expect(
      await votar(tokenB, aparelho(14), "Edu", [enqueteA.itens[0]]),
    ).toEqual({
      erro: "item_invalido",
    });
  });

  it("6 itens: quantidade_invalida; 31 itens: dados_invalidos", async () => {
    expect(await votar(tokenA, aparelho(15), "Fê", enqueteA.itens)).toEqual({
      erro: "quantidade_invalida",
    });
    const muitos = Array.from({ length: 31 }, () => crypto.randomUUID());
    expect(await votar(tokenA, aparelho(15), "Fê", muitos)).toEqual({
      erro: "dados_invalidos",
    });
  });

  it("sem nome ou aparelho inválido: dados_invalidos", async () => {
    expect(
      await votar(tokenA, aparelho(16), "  ", [enqueteA.itens[0]]),
    ).toEqual({
      erro: "dados_invalidos",
    });
    expect(await votar(tokenA, "curto", "Gil", [enqueteA.itens[0]])).toEqual({
      erro: "dados_invalidos",
    });
  });

  it("token do autor: link_invalido", async () => {
    expect(
      await votar(tokenAutorA, aparelho(17), "Hugo", [enqueteA.itens[0]]),
    ).toEqual({
      erro: "link_invalido",
    });
  });

  it("o 151º votante: limite_votantes", async () => {
    const dono = await criarUsuario(db, "limite@exemplo.com");
    const livro = await ativarPlano(db, dono, "Lia");
    const token = "v1_limiteLIMITELIMITE000";
    await criarLinkFamilia(db, livro, dono, token);
    const { enquete, itens } = await abrirEnquete(db, livro, dono, [
      { texto: "Um item" },
      { texto: "Outro item" },
    ]);
    await db.query(
      `insert into public.poll_votes (book_id, poll_id, poll_item_id, votante, aparelho_hash, nome)
       select $1, $2, $3, gen_random_uuid(), repeat('a', 64), 'X' from generate_series(1, 150)`,
      [livro, enquete, itens[0]],
    );
    expect(await votar(token, aparelho(18), "Ivo", [itens[0]])).toEqual({
      erro: "limite_votantes",
    });
  });

  it("a 301ª troca na hora: limite_por_hora", async () => {
    const dono = await criarUsuario(db, "trocas@exemplo.com");
    const livro = await ativarPlano(db, dono, "Rui");
    const token = "v1_trocasTROCASTROCAS000";
    await criarLinkFamilia(db, livro, dono, token);
    const { enquete, itens } = await abrirEnquete(db, livro, dono, [
      { texto: "Um item" },
      { texto: "Outro item" },
    ]);
    await db.query(`update public.polls set trocas = 300 where id = $1`, [
      enquete,
    ]);
    expect(await votar(token, aparelho(19), "Jô", [itens[0]])).toEqual({
      erro: "limite_por_hora",
    });
  });

  it("enquete encerrada: sem_enquete; plano vencido: livro_fechado", async () => {
    const dono = await criarUsuario(db, "fim@exemplo.com");
    const livro = await ativarPlano(db, dono, "Téo");
    const token = "v1_fimFIMFIMFIMFIMFIM000";
    await criarLinkFamilia(db, livro, dono, token);
    const { enquete, itens } = await abrirEnquete(db, livro, dono, [
      { texto: "Um item" },
      { texto: "Outro item" },
    ]);
    await como(db, "authenticated", { sub: dono }, (tx) =>
      tx.query(`select public.enquete_encerrar($1)`, [enquete]),
    );
    expect(await votar(token, aparelho(20), "Lu", [itens[0]])).toEqual({
      erro: "sem_enquete",
    });
    await vencerPlano(db, livro);
    expect(await votar(token, aparelho(20), "Lu", [itens[0]])).toEqual({
      erro: "livro_fechado",
    });
  });
});

describe("causos", () => {
  it("só com texto: entra em A e aparece para o membro", async () => {
    const r = (await enviarCauso(tokenA, {
      texto: "Pede pra contar da roça",
    })) as {
      id: string;
      livro: string;
      audio_caminho: string | null;
    };
    expect(r.livro).toBe(livroA);
    expect(r.audio_caminho).toBeNull();
    const visto = await como(db, "authenticated", { sub: ana }, (tx) =>
      tx.query(`select id from public.causos where id = $1`, [r.id]),
    );
    expect(visto.rows).toHaveLength(1);
  });

  it("com áudio: caminho fixo do livro, invisível até a confirmação", async () => {
    const r = (await enviarCauso(tokenA, { texto: null, audio: "webm" })) as {
      id: string;
      audio_caminho: string;
    };
    expect(r.audio_caminho).toBe(`livros/${livroA}/causos/${r.id}.webm`);
    const lerComoAna = () =>
      como(db, "authenticated", { sub: ana }, (tx) =>
        tx.query(`select id from public.causos where id = $1`, [r.id]),
      );
    expect((await lerComoAna()).rows).toHaveLength(0);

    const caminho = (token: string) =>
      como(db, "service_role", {}, async (tx) => {
        const q = await tx.query<{ c: string | null }>(
          `select public.servico_caminho_audio_causo($1, $2) as c`,
          [token, r.id],
        );
        return q.rows[0].c;
      });
    expect(await caminho(tokenB)).toBeNull();
    expect(await caminho(tokenA)).toBe(r.audio_caminho);

    const confirmar = (token: string) =>
      como(db, "service_role", {}, async (tx) => {
        const q = await tx.query<{ ok: boolean }>(
          `select public.servico_confirmar_audio_causo($1, $2, 40) as ok`,
          [token, r.id],
        );
        return q.rows[0].ok;
      });
    expect(await confirmar(tokenB)).toBe(false);
    expect(await confirmar(tokenA)).toBe(true);
    expect(await confirmar(tokenA)).toBe(false); // já confirmado
    expect(await caminho(tokenA)).toBeNull();
    expect((await lerComoAna()).rows).toHaveLength(1);
  });

  it("causo antigo (mais de 30 min) não recebe upload", async () => {
    const r = (await enviarCauso(tokenA, { texto: null, audio: "m4a" })) as {
      id: string;
    };
    await db.query(
      `update public.causos set criado_em = now() - interval '31 minutes' where id = $1`,
      [r.id],
    );
    const c = await como(db, "service_role", {}, async (tx) => {
      const q = await tx.query<{ c: string | null }>(
        `select public.servico_caminho_audio_causo($1, $2) as c`,
        [tokenA, r.id],
      );
      return q.rows[0].c;
    });
    expect(c).toBeNull();
  });

  it("texto e áudio juntos, ou nenhum dos dois: dados_invalidos", async () => {
    expect(await enviarCauso(tokenA, { texto: "x", audio: "webm" })).toEqual({
      erro: "dados_invalidos",
    });
    expect(await enviarCauso(tokenA, { texto: "  ", audio: null })).toEqual({
      erro: "dados_invalidos",
    });
    expect(await enviarCauso(tokenA, { texto: null, audio: "mp3" })).toEqual({
      erro: "dados_invalidos",
    });
  });

  it("sem consentimento: sem_consentimento", async () => {
    expect(await enviarCauso(tokenA, { consentimento: false })).toEqual({
      erro: "sem_consentimento",
    });
  });

  it("token do autor: link_invalido", async () => {
    expect(await enviarCauso(tokenAutorA)).toEqual({ erro: "link_invalido" });
  });

  it("caminho de outro livro, com ../ ou %2e%2e: recusado pela tabela", async () => {
    const id = crypto.randomUUID();
    for (const caminho of [
      `livros/${livroB}/causos/${id}.webm`,
      `livros/${livroA}/causos/../../${livroB}/causos/${id}.webm`,
      `livros/${livroA}/causos/%2e%2e/%2e%2e/${livroB}/causos/${id}.webm`,
    ]) {
      const r = await como(db, "service_role", {}, (tx) =>
        tenta(
          tx,
          `insert into public.causos (id, book_id, nome, audio_caminho, consentimento_em, consentimento_versao)
           values ($1, $2, 'x', $3, now(), 1)`,
          [id, livroA, caminho],
        ),
      );
      expect(r.erro).toMatch(/causos_audio_do_livro/);
    }
  });

  it("o 21º na hora e o 41º no dia: limite_causos", async () => {
    const dono = await criarUsuario(db, "spam@exemplo.com");
    const livro = await ativarPlano(db, dono, "Bia");
    const token = "v1_spamSPAMSPAMSPAMSPAM0";
    await criarLinkFamilia(db, livro, dono, token);
    await db.query(
      `insert into public.causos (book_id, nome, texto, consentimento_em, consentimento_versao)
       select $1, 'x', 'texto', now(), 1 from generate_series(1, 20)`,
      [livro],
    );
    expect(await enviarCauso(token)).toEqual({ erro: "limite_causos" });
    await db.query(
      `update public.causos set criado_em = now() - interval '2 hours' where book_id = $1`,
      [livro],
    );
    expect(await enviarCauso(token)).not.toHaveProperty("erro");
    await db.query(
      `insert into public.causos (book_id, nome, texto, consentimento_em, consentimento_versao, criado_em)
       select $1, 'x', 'texto', now(), 1, now() - interval '3 hours' from generate_series(1, 19)`,
      [livro],
    );
    expect(await enviarCauso(token)).toEqual({ erro: "limite_causos" });
  });

  it("plano vencido: livro_fechado", async () => {
    const dono = await criarUsuario(db, "vencido@exemplo.com");
    const livro = await ativarPlano(db, dono, "Gil");
    const token = "v1_vencidoVENCIDO0000000";
    await criarLinkFamilia(db, livro, dono, token);
    await vencerPlano(db, livro);
    expect(await enviarCauso(token)).toEqual({ erro: "livro_fechado" });
  });
});

describe("link da família", () => {
  it("quem não é membro não troca o link", async () => {
    const r = await como(db, "service_role", {}, (tx) =>
      tenta(
        tx,
        `select public.servico_trocar_link_familia($1, $2, $3, repeat('d', 64), 1::smallint)`,
        [livroA, beto, crypto.randomUUID()],
      ),
    );
    expect(r).toEqual({ erro: "sem_permissao" });
  });

  it("trocar revoga o antigo, e o revogado não volta", async () => {
    const r = await db.query<{ n: number }>(
      `select count(*)::int as n from public.family_access where book_id = $1 and revogado_em is null`,
      [livroA],
    );
    expect(r.rows[0].n).toBe(1);
    const dono = await criarUsuario(db, "troca@exemplo.com");
    const livro = await ativarPlano(db, dono, "Nina");
    const velho = await criarLinkFamilia(
      db,
      livro,
      dono,
      "v1_trocaVelhoTROCA000000",
    );
    await criarLinkFamilia(db, livro, dono, "v1_trocaNovoTROCA0000000");
    const desfazer = await como(db, "service_role", {}, (tx) =>
      tenta(
        tx,
        `update public.family_access set revogado_em = null where id = $1`,
        [velho],
      ),
    );
    expect(desfazer).toEqual({ erro: "link_ja_revogado" });
  });
});

describe("anon direto nas tabelas", () => {
  it.each([
    "photos",
    "causos",
    "prompts",
    "family_access",
    "polls",
    "poll_items",
    "poll_votes",
  ])("%s: permission denied", async (tabela) => {
    const r = await anon((tx) => tenta(tx, `select 1 from public.${tabela}`));
    expect(r.erro).toMatch(/permission denied/);
    const w = await anon((tx) => tenta(tx, `delete from public.${tabela}`));
    expect(w.erro).toMatch(/permission denied/);
  });
});
