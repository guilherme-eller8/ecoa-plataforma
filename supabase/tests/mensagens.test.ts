// Mensagens da família (prompt 12). Design: docs/designs/mensagens-familia.md (v2).
// O link /m só escreve: quem tem o link não lê nada de ninguém; o rascunho é do aparelho;
// o autor e anon nunca alcançam family_messages, message_access nem as funções do link;
// o que a pessoa enviou não muda; enviada só sai de vez pelo responsável.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  ativarPlano,
  como,
  criarBanco,
  criarLinkFamilia,
  criarUsuario,
  vencerPlano,
} from "./banco";

const RAIZ = path.resolve(__dirname, "..");
const up = readFileSync(
  path.join(RAIZ, "migrations/20261122120000_mensagens_familia.sql"),
  "utf8",
);
const down = readFileSync(
  path.join(RAIZ, "reversao/20261122120000_mensagens_familia.down.sql"),
  "utf8",
);

let db: PGlite;
let ana: string; // responsável do livro A
let caio: string; // co-facilitador do livro A
let beto: string; // responsável do livro B
let livroA: string;
let livroB: string;

const tokenA = "v1_mensagemAAAAAAAAAAAAA";
const tokenB = "v1_mensagemBBBBBBBBBBBBB";
const tokenFamiliaA = "v1_familiaAAAAAAAAAAAAAA";
const tokenAutorA = "v1_autorAAAAAAAAAAAAAAAA";
const ap = (n: number) => String(n).padStart(36, "0");
const sha = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");

async function sql<T = Record<string, unknown>>(q: string, p: unknown[] = []) {
  return (await db.query<T>(q, p)).rows;
}

type Resposta =
  | { linhas: Record<string, unknown>[]; erro?: undefined }
  | { erro: string; linhas?: undefined };

async function comoPapel(
  papel: "anon" | "authenticated" | "service_role" | "porta_autor",
  usuario: string | null,
  q: string,
  p: unknown[] = [],
): Promise<Resposta> {
  return como(db, papel, usuario ? { sub: usuario } : {}, async (tx) => {
    await tx.exec("savepoint s");
    try {
      const linhas = (await tx.query<Record<string, unknown>>(q, p)).rows;
      await tx.exec("release savepoint s");
      return { linhas };
    } catch (e) {
      await tx.exec("rollback to savepoint s");
      return { erro: (e as Error).message };
    }
  });
}
const anon = (q: string, p: unknown[] = []) => comoPapel("anon", null, q, p);
const servico = (q: string, p: unknown[] = []) =>
  comoPapel("service_role", null, q, p);
const comoMembro = (u: string, q: string, p: unknown[] = []) =>
  comoPapel("authenticated", u, q, p);
const valor = (r: Resposta) => {
  if (r.erro) throw new Error(r.erro);
  return Object.values(r.linhas![0])[0];
};
const semGatilho = (q: string) =>
  db.exec(`
    alter table public.family_messages disable trigger family_messages_regras;
    ${q};
    alter table public.family_messages enable trigger family_messages_regras;`);

async function trocarLink(livro: string, usuario: string, token: string) {
  return servico(
    `select public.servico_trocar_link_mensagem($1, $2, gen_random_uuid(), $3, 1::smallint)`,
    [livro, usuario, sha(token)],
  );
}

type Criada = {
  id: string;
  livro: string;
  audio_caminho: string | null;
  foto_caminho: string | null;
};

async function criar(
  c: {
    token?: string;
    aparelho?: string;
    nome?: string;
    relacao?: string;
    audio?: string | null;
    foto?: boolean;
    consentimento?: boolean;
  } = {},
): Promise<Criada | { erro: string }> {
  const r = await servico(
    `select public.servico_mensagem_criar($1, $2, $3, $4, $5, $6, $7, 1::smallint) as m`,
    [
      c.token ?? tokenA,
      c.aparelho ?? ap(1),
      c.nome ?? "Lúcia",
      c.relacao ?? "sobrinha",
      c.audio === undefined ? "webm" : c.audio,
      c.foto ?? false,
      c.consentimento ?? true,
    ],
  );
  return r.erro ? { erro: r.erro } : (r.linhas![0].m as Criada);
}
const criada = async (c: Parameters<typeof criar>[0] = {}) => {
  const m = await criar(c);
  if ("erro" in m) throw new Error(m.erro);
  return m;
};

const confirmarAudio = (id: string, aparelho = ap(1), dur = 120) =>
  servico(
    `select public.servico_confirmar_audio_mensagem($1, $2, $3, $4) as ok`,
    [tokenA, aparelho, id, dur],
  );
const reservar = (id: string, aparelho = ap(1)) =>
  servico(
    `select public.servico_mensagem_reservar_transcricao($1, $2, $3) as r`,
    [tokenA, aparelho, id],
  );
const transcrita = (
  id: string,
  reserva: string,
  texto: string,
  fim = 100,
  aparelho = ap(1),
) =>
  servico(
    `select public.servico_mensagem_transcrita($1, $2, $3, $4, $5, $6) as r`,
    [tokenA, aparelho, id, reserva, texto, fim],
  );
const falhou = (id: string, reserva: string) =>
  servico(`select public.servico_mensagem_transcricao_falhou($1, $2, $3, $4)`, [
    tokenA,
    ap(1),
    id,
    reserva,
  ]);
const enviar = (id: string, texto: string | null, aparelho = ap(1)) =>
  servico(`select public.servico_mensagem_enviar($1, $2, $3, $4) as r`, [
    tokenA,
    aparelho,
    id,
    texto,
  ]);
const reservaDe = async (id: string) =>
  (valor(await reservar(id)) as { reserva: string }).reserva;

/** Mensagem enviada com áudio e texto, pronta para os testes dos membros. */
async function enviada(texto = "Tio, obrigado por tudo.", aparelho = ap(1)) {
  const m = await criada({ aparelho });
  valor(await confirmarAudio(m.id, aparelho));
  const r = valor(await reservar(m.id, aparelho)) as { reserva: string };
  valor(
    await transcrita(m.id, r.reserva, "tio obrigado por tudo", 100, aparelho),
  );
  valor(await enviar(m.id, texto, aparelho));
  return m.id;
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  caio = await criarUsuario(db, "caio@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Nelson da Silva");
  livroB = await ativarPlano(db, beto, "Jair Souza");
  await sql(
    `insert into public.book_members (book_id, user_id, papel) values ($1, $2, 'cofacilitador')`,
    [livroA, caio],
  );
  await sql(
    `update public.books set autor_apelido = 'Tio Nelson' where id = $1`,
    [livroA],
  );
  valor(await trocarLink(livroA, ana, tokenA));
  valor(await trocarLink(livroB, beto, tokenB));
  await criarLinkFamilia(db, livroA, ana, tokenFamiliaA);
  await sql(
    `insert into public.author_access (book_id, token_hash) values ($1, $2)`,
    [livroA, sha(tokenAutorA)],
  );
}, 120000);

afterAll(async () => {
  await db.close();
});

// Cada teste começa sem mensagens.
beforeEach(async () => {
  await semGatilho(`delete from public.family_messages`);
});

describe("privilégios e RLS", () => {
  it.each(["anon", "porta_autor"])(
    "%s sem privilégio em family_messages e message_access",
    async (papel) => {
      for (const t of ["family_messages", "message_access"]) {
        const [r] = await sql<{ tabela: boolean; coluna: boolean }>(
          `select has_table_privilege($1, $2, 'select, insert, update, delete') as tabela,
                  has_any_column_privilege($1, $2, 'select, insert, update') as coluna`,
          [papel, `public.${t}`],
        );
        expect(r, t).toEqual({ tabela: false, coluna: false });
      }
    },
  );

  it.each(["anon", "authenticated", "porta_autor"])(
    "%s não executa nenhuma função do link /m",
    async (papel) => {
      const r = await sql<{ nome: string }>(
        `select p.proname as nome from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname in ('public', 'privado') and p.proname like '%mensage%'
           and p.proname not in ('mensagem_editar', 'mensagem_no_livro', 'mensagem_arquivar', 'mensagem_apagar')
           and has_function_privilege($1, p.oid, 'execute')`,
        [papel],
      );
      expect(r).toEqual([]);
    },
  );

  it("o autor nunca é membro: book_members só tem responsável e co-facilitador", async () => {
    const r = await sql<{ v: string }>(
      `select unnest(enum_range(null::public.papel_membro))::text as v`,
    );
    expect(r.map((x) => x.v)).toEqual(["responsavel", "cofacilitador"]);
  });

  it("authenticated lê só as colunas da lista, sem aparelho nem transcrição; não escreve", async () => {
    const r = await sql<{ coluna: string }>(
      `select column_name as coluna from information_schema.columns
       where table_schema = 'public' and table_name = 'family_messages'
         and has_column_privilege('authenticated', 'public.family_messages', column_name, 'select')
       order by 1`,
    );
    expect(r.map((x) => x.coluna)).toEqual(
      [
        "audio_caminho",
        "audio_recebido_em",
        "book_id",
        "criado_em",
        "duracao_s",
        "editado_em",
        "enviada_em",
        "estado",
        "foto_caminho",
        "foto_recebida_em",
        "id",
        "no_livro",
        "no_livro_em",
        "nome",
        "relacao",
        "texto",
        "texto_enviado",
      ].sort(),
    );
    const [w] = await sql<{ escreve: boolean }>(
      `select has_any_column_privilege('authenticated', 'public.family_messages', 'insert, update') as escreve`,
    );
    expect(w.escreve).toBe(false);
  });

  it("a política restritiva do prompt 10 continua; a do membro exclui rascunho", async () => {
    const p = await sql<{
      policyname: string;
      permissive: string;
      roles: string[];
    }>(
      `select policyname, permissive, roles from pg_policies
       where tablename = 'family_messages' order by policyname`,
    );
    expect(p).toEqual([
      {
        policyname: "membro lê enviadas",
        permissive: "PERMISSIVE",
        roles: ["authenticated"],
      },
      {
        policyname: "sem login nunca lê",
        permissive: "RESTRICTIVE",
        roles: ["anon", "porta_autor"],
      },
    ]);
  });

  it("membro vê enviadas e arquivadas do próprio livro, nunca rascunho nem outro livro", async () => {
    const id = await enviada();
    await criada({ aparelho: ap(2) });
    const a = await comoMembro(
      ana,
      `select id, nome from public.family_messages`,
    );
    expect(a.linhas).toEqual([{ id, nome: "Lúcia" }]);
    const c = await comoMembro(caio, `select id from public.family_messages`);
    expect(c.linhas).toEqual([{ id }]);
    const b = await comoMembro(beto, `select id from public.family_messages`);
    expect(b.linhas).toEqual([]);
    const h = await comoMembro(
      ana,
      `select aparelho_hash from public.family_messages`,
    );
    expect(h.erro).toMatch(/permission denied/);
    const t = await comoMembro(
      ana,
      `select transcricao from public.family_messages`,
    );
    expect(t.erro).toMatch(/permission denied/);
  });

  it("membro lê o link de mensagens do próprio livro, sem o hash", async () => {
    const a = await comoMembro(
      ana,
      `select book_id from public.message_access`,
    );
    expect(a.linhas).toEqual([{ book_id: livroA }]);
    const h = await comoMembro(
      ana,
      `select token_hash from public.message_access`,
    );
    expect(h.erro).toMatch(/permission denied/);
  });
});

describe("página do link", () => {
  const pagina = async (token: string) =>
    valor(
      await servico(`select public.servico_mensagem_pagina($1) as p`, [token]),
    );

  it("mostra só o apelido (nunca o nome completo) e se está aberto", async () => {
    expect(await pagina(tokenA)).toEqual({ autor: "Tio Nelson", aberto: true });
  });

  it.each([
    ["inválido", "v1_naoexisteAAAAAAAAAAAA"],
    ["da família", tokenFamiliaA],
    ["do autor", tokenAutorA],
    ["curto", "v1_x"],
  ])("token %s não abre", async (_n, token) => {
    expect(await pagina(token)).toBeNull();
  });

  it("o token de mensagens não abre a página da família", async () => {
    const r = await anon(`select public.familia_pagina($1, $2) as p`, [
      tokenA,
      ap(1),
    ]);
    expect(valor(r)).toBeNull();
  });

  it("trocar o link derruba o antigo; livro sem apelido não mostra nome", async () => {
    const novo = "v1_mensagemNOVOAAAAAAAAA";
    valor(await trocarLink(livroB, beto, novo));
    expect(await pagina(tokenB)).toBeNull();
    expect(await pagina(novo)).toEqual({ autor: null, aberto: true });
    expect(await criar({ token: tokenB })).toEqual({ erro: "link_invalido" });
  });

  it("co-facilitador não troca o link ativo (P60)", async () => {
    expect(await trocarLink(livroA, caio, "v1_mensagemCAIOAAAAAAAAA")).toEqual({
      erro: "sem_permissao",
    });
  });

  it("co-facilitador gera o primeiro link", async () => {
    const zeca = await criarUsuario(db, "zeca@exemplo.com");
    const livro = await ativarPlano(db, zeca, "Lia");
    const cofac = await criarUsuario(db, "cofac@exemplo.com");
    await sql(
      `insert into public.book_members (book_id, user_id, papel) values ($1, $2, 'cofacilitador')`,
      [livro, cofac],
    );
    valor(await trocarLink(livro, cofac, "v1_mensagemPRIMEIROAAAAA"));
  });

  it("trocar o link é só de membro do livro", async () => {
    expect(await trocarLink(livroA, beto, "v1_mensagemXXXXXXXXXXXXX")).toEqual({
      erro: "sem_permissao",
    });
  });
});

describe("criar o rascunho", () => {
  it("fixa os caminhos no livro e na mensagem", async () => {
    const m = await criada({ audio: "m4a", foto: true });
    expect(m.livro).toBe(livroA);
    expect(m.audio_caminho).toBe(`livros/${livroA}/mensagens/${m.id}.m4a`);
    expect(m.foto_caminho).toBe(`livros/${livroA}/mensagens/${m.id}-foto.jpg`);
  });

  it.each([
    [{ nome: " " }, "dados_invalidos"],
    [{ relacao: "" }, "dados_invalidos"],
    [{ nome: "x".repeat(81) }, "dados_invalidos"],
    [{ audio: "mp3" }, "dados_invalidos"],
    [{ aparelho: "curto" }, "dados_invalidos"],
    [{ consentimento: false }, "sem_consentimento"],
    [{ token: tokenFamiliaA }, "link_invalido"],
    [{ token: tokenAutorA }, "link_invalido"],
  ])("%o → %s", async (c, erro) => {
    expect(await criar(c)).toEqual({ erro });
  });

  it("plano vencido fecha o link", async () => {
    const outro = await criarUsuario(db, "outro@exemplo.com");
    const livro = await ativarPlano(db, outro, "Zé");
    valor(await trocarLink(livro, outro, "v1_mensagemVENCIDOAAAAAA"));
    await vencerPlano(db, livro);
    expect(await criar({ token: "v1_mensagemVENCIDOAAAAAA" })).toEqual({
      erro: "livro_fechado",
    });
    const p = await servico(`select public.servico_mensagem_pagina($1) as p`, [
      "v1_mensagemVENCIDOAAAAAA",
    ]);
    expect(valor(p)).toMatchObject({ aberto: false });
  });

  it("no máximo 3 rascunhos abertos por aparelho; outro aparelho segue", async () => {
    for (let i = 0; i < 3; i++) await criada();
    expect(await criar()).toEqual({ erro: "limite_rascunhos" });
    expect(await criar({ aparelho: ap(2) })).toMatchObject({ livro: livroA });
  });

  it("no máximo 100 rascunhos por livro por dia", async () => {
    for (let i = 0; i < 100; i++) await criada({ aparelho: ap(1000 + i) });
    expect(await criar({ aparelho: ap(9999) })).toEqual({
      erro: "limite_mensagens",
    });
  });
});

describe("upload, transcrição e envio: só o aparelho que criou", () => {
  it("o caminho do upload sai só para o mesmo aparelho e só antes de chegar", async () => {
    const m = await criada({ foto: true });
    const caminho = (aparelho: string, tipo: string) =>
      servico(`select public.servico_caminho_mensagem($1, $2, $3, $4) as c`, [
        tokenA,
        aparelho,
        m.id,
        tipo,
      ]);
    expect(valor(await caminho(ap(1), "audio"))).toBe(m.audio_caminho);
    expect(valor(await caminho(ap(1), "foto"))).toBe(m.foto_caminho);
    expect(await caminho(ap(2), "audio")).toEqual({
      erro: "mensagem_nao_encontrada",
    });
    valor(await confirmarAudio(m.id));
    expect(valor(await caminho(ap(1), "audio"))).toBeNull();
  });

  it("duração declarada acima de 5 min e 10 s é recusada", async () => {
    const m = await criada();
    expect(await confirmarAudio(m.id, ap(1), 311)).toEqual({
      erro: "dados_invalidos",
    });
    expect(valor(await confirmarAudio(m.id, ap(1), 310))).toBe(true);
    expect(valor(await confirmarAudio(m.id, ap(1), 200))).toBe(false);
  });

  it("transcrição: precisa do áudio, reserva por 2 min, grava uma vez, devolve ao mesmo aparelho", async () => {
    const m = await criada();
    expect(await reservar(m.id)).toEqual({ erro: "audio_nao_chegou" });
    valor(await confirmarAudio(m.id));
    const r = valor(await reservar(m.id)) as Record<string, string>;
    expect(r).toMatchObject({
      caminho: m.audio_caminho,
      apelido: "Tio Nelson",
    });
    expect(valor(await reservar(m.id))).toEqual({ espera: true });
    expect(await reservar(m.id, ap(2))).toEqual({
      erro: "mensagem_nao_encontrada",
    });
    expect(valor(await transcrita(m.id, crypto.randomUUID(), "intrusa"))).toBe(
      "reserva_vencida",
    );
    expect(valor(await transcrita(m.id, r.reserva, "primeira"))).toBe("ok");
    expect(valor(await transcrita(m.id, r.reserva, "segunda"))).toBe(
      "ja_havia",
    );
    expect(valor(await reservar(m.id))).toEqual({ texto: "primeira" });
  });

  it("a falha só libera a reserva de quem falhou; no máximo 3 tentativas por mensagem", async () => {
    const m = await criada();
    valor(await confirmarAudio(m.id));
    const r1 = await reservaDe(m.id);
    valor(await falhou(m.id, crypto.randomUUID())); // não é a reserva dela: nada muda
    expect(valor(await reservar(m.id))).toEqual({ espera: true });
    valor(await falhou(m.id, r1));
    valor(await falhou(m.id, await reservaDe(m.id)));
    await reservaDe(m.id);
    await semGatilho(
      `update public.family_messages set transcricao_pedida_em = now() - interval '3 minutes'`,
    );
    expect(await reservar(m.id)).toEqual({ erro: "limite_transcricao" });
  });

  it("no máximo 60 transcrições por livro por dia", async () => {
    const m = await criada();
    valor(await confirmarAudio(m.id));
    await semGatilho(
      `insert into public.family_messages (book_id, access_id, aparelho_hash, nome, relacao,
         consentimento_em, consentimento_versao, transcricao_tentativas)
       select f.book_id, f.access_id, repeat('a', 64), 'X', 'Y', now(), 1, 3
       from public.family_messages f, generate_series(1, 20) where f.id = '${m.id}'`,
    );
    expect(await reservar(m.id)).toEqual({ erro: "limite_transcricao" });
  });

  it("áudio acima de 5 min (pela transcrição) é recusado e não envia", async () => {
    const m = await criada();
    valor(await confirmarAudio(m.id, ap(1), 290));
    const r = await reservaDe(m.id);
    expect(valor(await transcrita(m.id, r, "longo demais", 1800))).toBe(
      "audio_longo",
    );
    expect(await reservar(m.id)).toEqual({ erro: "audio_longo" });
    expect(await enviar(m.id, "oi")).toEqual({ erro: "audio_longo" });
  });

  it("enviar: outro aparelho não envia; áudio que não chegou trava; foto que não chegou fica de fora", async () => {
    const m = await criada({ foto: true });
    expect(await enviar(m.id, "oi", ap(2))).toEqual({
      erro: "mensagem_nao_encontrada",
    });
    expect(await enviar(m.id, "oi")).toEqual({ erro: "audio_nao_chegou" });
    valor(await confirmarAudio(m.id));
    const r = await reservaDe(m.id);
    valor(await transcrita(m.id, r, "oi tio"));
    expect(valor(await enviar(m.id, "Oi, tio!"))).toEqual({
      id: m.id,
      livro: livroA,
      audio: true,
      foto: false,
      transcricao: "oi tio",
    });
    const [x] = await sql(
      `select estado, texto, texto_enviado, foto_caminho, foto_recebida_em
       from public.family_messages where id = $1`,
      [m.id],
    );
    expect(x).toEqual({
      estado: "enviada",
      texto: "Oi, tio!",
      texto_enviado: "Oi, tio!",
      foto_caminho: m.foto_caminho,
      foto_recebida_em: null,
    });
    expect(await enviar(m.id, "de novo")).toEqual({
      erro: "mensagem_nao_encontrada",
    });
    // A foto que chegar atrasada não entra na mensagem enviada.
    expect(
      await servico(
        `update public.family_messages set foto_recebida_em = now() where id = $1`,
        [m.id],
      ),
    ).toEqual({ erro: "mensagem_imutavel" });
  });

  it("sempre precisa de texto, com ou sem áudio", async () => {
    const t = await criada({ audio: null });
    expect(await enviar(t.id, "  ")).toEqual({ erro: "mensagem_sem_texto" });
    expect(valor(await enviar(t.id, "Saudade!"))).toMatchObject({
      audio: false,
      transcricao: null,
    });
    const a = await criada();
    valor(await confirmarAudio(a.id));
    expect(await enviar(a.id, null)).toEqual({ erro: "mensagem_sem_texto" });
  });

  it("texto acima do limite é recusado", async () => {
    const t = await criada({ audio: null });
    expect(await enviar(t.id, "a".repeat(6001))).toEqual({
      erro: "dados_invalidos",
    });
  });

  it("no máximo 20 enviadas por hora por livro", async () => {
    for (let i = 0; i < 20; i++) {
      const m = await criada({ audio: null, aparelho: ap(200 + i) });
      valor(await enviar(m.id, "oi", ap(200 + i)));
    }
    const m = await criada({ audio: null, aparelho: ap(300) });
    expect(await enviar(m.id, "oi", ap(300))).toEqual({
      erro: "limite_mensagens",
    });
  });

  it("rascunho de mais de 48 h não é mais do aparelho", async () => {
    const m = await criada();
    await semGatilho(
      `update public.family_messages set criado_em = now() - interval '49 hours'`,
    );
    expect(await enviar(m.id, "oi")).toEqual({
      erro: "mensagem_nao_encontrada",
    });
  });
});

describe("membros", () => {
  it("editar, incluir no livro e arquivar (co-facilitador também)", async () => {
    const id = await enviada();
    valor(
      await comoMembro(caio, `select public.mensagem_editar($1, $2)`, [
        id,
        "Tio, valeu!",
      ]),
    );
    valor(
      await comoMembro(ana, `select public.mensagem_no_livro($1, true)`, [id]),
    );
    let [r] = await sql(
      `select texto, texto_enviado, no_livro, editado_por from public.family_messages where id = $1`,
      [id],
    );
    expect(r).toEqual({
      texto: "Tio, valeu!",
      texto_enviado: "Tio, obrigado por tudo.",
      no_livro: true,
      editado_por: caio,
    });
    valor(
      await comoMembro(caio, `select public.mensagem_arquivar($1, true)`, [id]),
    );
    [r] = await sql(
      `select estado, no_livro from public.family_messages where id = $1`,
      [id],
    );
    expect(r).toEqual({ estado: "arquivada", no_livro: false });
    expect(
      await comoMembro(ana, `select public.mensagem_no_livro($1, true)`, [id]),
    ).toMatchObject({ erro: "sem_permissao" });
    valor(
      await comoMembro(ana, `select public.mensagem_arquivar($1, false)`, [id]),
    );
    [r] = await sql(`select estado from public.family_messages where id = $1`, [
      id,
    ]);
    expect(r).toEqual({ estado: "enviada" });
  });

  it("texto vazio não é aceito", async () => {
    const id = await enviada();
    expect(
      await comoMembro(ana, `select public.mensagem_editar($1, ' ')`, [id]),
    ).toEqual({
      erro: "mensagem_sem_texto",
    });
  });

  it("outro livro, rascunho e anon são barrados", async () => {
    const id = await enviada();
    expect(
      await comoMembro(beto, `select public.mensagem_editar($1, 'x')`, [id]),
    ).toEqual({
      erro: "sem_permissao",
    });
    const r = await criada({ aparelho: ap(2) });
    expect(
      await comoMembro(ana, `select public.mensagem_no_livro($1, true)`, [
        r.id,
      ]),
    ).toEqual({
      erro: "sem_permissao",
    });
    expect(
      await anon(`select public.mensagem_editar($1, 'x')`, [id]),
    ).toMatchObject({
      erro: expect.stringMatching(/permission denied/),
    });
  });

  it("apagar de vez: só o responsável, só arquivada; devolve os caminhos", async () => {
    const id = await enviada();
    expect(
      await comoMembro(ana, `select * from public.mensagem_apagar($1)`, [id]),
    ).toEqual({
      erro: "sem_permissao",
    });
    valor(
      await comoMembro(ana, `select public.mensagem_arquivar($1, true)`, [id]),
    );
    expect(
      await comoMembro(caio, `select * from public.mensagem_apagar($1)`, [id]),
    ).toEqual({
      erro: "sem_permissao",
    });
    expect(
      await comoMembro(beto, `select * from public.mensagem_apagar($1)`, [id]),
    ).toEqual({
      erro: "sem_permissao",
    });
    const r = await comoMembro(
      ana,
      `select * from public.mensagem_apagar($1)`,
      [id],
    );
    expect(r.linhas).toEqual([
      {
        audio_caminho: `livros/${livroA}/mensagens/${id}.webm`,
        foto_caminho: null,
      },
    ]);
    expect(
      await sql(`select id from public.family_messages where id = $1`, [id]),
    ).toEqual([]);
  });
});

describe("o que foi enviado não some nem muda", () => {
  it("enviada não é apagada nem pela chave secreta; truncate também não", async () => {
    const id = await enviada();
    expect(
      await servico(`delete from public.family_messages where id = $1`, [id]),
    ).toEqual({
      erro: "mensagem_imutavel",
    });
    expect(await servico(`truncate public.family_messages`)).toMatchObject({
      erro: expect.stringMatching(/mensagem_imutavel|permission denied/),
    });
  });

  it("a marca de apagar vale só para a mensagem marcada", async () => {
    const a = await enviada("A", ap(1));
    const b = await enviada("B", ap(2));
    const r = await como(db, "service_role", {}, async (tx) => {
      await tx.query(`select set_config('ecoa.apagar_mensagem', $1, true)`, [
        a,
      ]);
      await tx.exec("savepoint s");
      try {
        await tx.query(`delete from public.family_messages where id = $1`, [b]);
        return "apagou";
      } catch (e) {
        await tx.exec("rollback to savepoint s");
        return (e as Error).message;
      }
    });
    expect(r).toBe("mensagem_imutavel");
  });

  it.each([
    ["texto_enviado", `texto_enviado = 'outro'`],
    ["transcricao", `transcricao = 'outra'`],
    ["nome", `nome = 'Outro'`],
    [
      "volta a rascunho",
      `estado = 'rascunho', enviada_em = null, texto = null, texto_enviado = null`,
    ],
    ["áudio", `audio_caminho = null`],
    ["foto", `foto_caminho = 'outra.jpg'`],
    ["recusar o áudio depois", `audio_recusado = true`],
  ])("%s não muda depois de enviada", async (_n, set) => {
    const id = await enviada();
    expect(
      await servico(`update public.family_messages set ${set} where id = $1`, [
        id,
      ]),
    ).toMatchObject({
      erro: expect.stringMatching(/mensagem_imutavel|violates/),
    });
  });
});

describe("limpeza dos rascunhos", () => {
  it("lista e apaga só rascunhos vencidos", async () => {
    const velho = await criada({ foto: true });
    const novo = await criada({ aparelho: ap(2) });
    const id = await enviada("oi", ap(3));
    await semGatilho(
      `update public.family_messages set criado_em = now() - interval '49 hours'
       where id in ('${velho.id}', '${id}')`,
    );
    const lista = await servico(
      `select * from public.servico_mensagem_rascunhos_vencidos(100)`,
    );
    expect(lista.linhas).toEqual([
      {
        id: velho.id,
        audio_caminho: velho.audio_caminho,
        foto_caminho: velho.foto_caminho,
      },
    ]);
    expect(
      valor(
        await servico(
          `select public.servico_mensagem_apagar_rascunhos($1::uuid[])`,
          [[velho.id, novo.id, id]],
        ),
      ),
    ).toBe(1);
    const ficou = await sql<{ id: string }>(
      `select id from public.family_messages`,
    );
    expect(ficou.map((x) => x.id).sort()).toEqual([novo.id, id].sort());
  });
});

describe("reversão", () => {
  it("trava com mensagem; forçada passa e sobe de novo", async () => {
    await enviada();
    await expect(db.exec(down)).rejects.toThrow(/reversao_com_mensagens/);
    await db.exec(`set ecoa.reversao_destrutiva = 'sim'`);
    await db.exec(down);
    await db.exec(`reset ecoa.reversao_destrutiva`);
    const [c] = await sql<{ n: number }>(
      `select count(*)::int as n from information_schema.columns
       where table_schema = 'public' and table_name = 'family_messages'`,
    );
    expect(c.n).toBe(3);
    await db.exec(up);
    valor(await trocarLink(livroA, ana, tokenA));
    expect(await criada()).toMatchObject({ livro: livroA });
  });
});
