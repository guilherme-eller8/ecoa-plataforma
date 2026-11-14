// Mensagens da família (prompt 12). Design: docs/designs/mensagens-familia.md.
// O link /m só escreve: quem tem o link não lê nada de ninguém; o rascunho é do aparelho;
// o autor e anon nunca alcançam family_messages nem message_access; enviada nunca some.
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
  path.join(RAIZ, "migrations/20261121120000_mensagens_familia.sql"),
  "utf8",
);
const down = readFileSync(
  path.join(RAIZ, "reversao/20261121120000_mensagens_familia.down.sql"),
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
  const r = await anon(
    `select public.mensagem_criar($1, $2, $3, $4, $5, $6, $7, 1::smallint) as m`,
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
const transcrita = (id: string, texto: string, aparelho = ap(1)) =>
  servico(`select public.servico_mensagem_transcrita($1, $2, $3, $4) as ok`, [
    tokenA,
    aparelho,
    id,
    texto,
  ]);
const enviar = (id: string, texto: string | null, aparelho = ap(1)) =>
  anon(`select public.mensagem_enviar($1, $2, $3, $4) as r`, [
    tokenA,
    aparelho,
    id,
    texto,
  ]);

/** Mensagem enviada com áudio e texto, pronta para os testes dos membros. */
async function enviada(texto = "Tio, obrigado por tudo.") {
  const m = await criada();
  valor(await confirmarAudio(m.id));
  valor(await reservar(m.id));
  valor(await transcrita(m.id, "Tio obrigado por tudo"));
  valor(await enviar(m.id, texto));
  return m.id;
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  caio = await criarUsuario(db, "caio@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Nelson");
  livroB = await ativarPlano(db, beto, "Jair");
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

// Cada teste começa sem mensagens (o gatilho só deixa apagar com a reversão autorizada).
beforeEach(async () => {
  await db.exec(`
    alter table public.family_messages disable trigger family_messages_regras;
    delete from public.family_messages;
    alter table public.family_messages enable trigger family_messages_regras;`);
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

  it("a política restritiva do prompt 10 continua; membro lê só enviadas", async () => {
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

  it("membro vê as enviadas do próprio livro, nunca rascunho nem outro livro", async () => {
    const id = await enviada();
    const rascunho = await criada();
    const a = await comoMembro(
      ana,
      `select id, nome from public.family_messages`,
    );
    expect(a.linhas).toEqual([{ id, nome: "Lúcia" }]);
    const c = await comoMembro(caio, `select id from public.family_messages`);
    expect(c.linhas).toEqual([{ id }]);
    const b = await comoMembro(beto, `select id from public.family_messages`);
    expect(b.linhas).toEqual([]);
    expect(rascunho.id).not.toBe(id);
    const h = await comoMembro(
      ana,
      `select aparelho_hash from public.family_messages`,
    );
    expect(h.erro).toMatch(/permission denied/);
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
    valor(await anon(`select public.mensagem_pagina($1) as p`, [token]));

  it("mostra só o apelido e se está aberto", async () => {
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

  it("trocar o link derruba o antigo", async () => {
    const novo = "v1_mensagemNOVOAAAAAAAAA";
    valor(await trocarLink(livroB, beto, novo));
    expect(await pagina(tokenB)).toBeNull();
    expect(await pagina(novo)).toMatchObject({ autor: "Jair" });
    expect((await criar({ token: tokenB })) as { erro: string }).toEqual({
      erro: "link_invalido",
    });
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
    const p = await anon(`select public.mensagem_pagina($1) as p`, [
      "v1_mensagemVENCIDOAAAAAA",
    ]);
    expect(valor(p)).toMatchObject({ aberto: false });
  });

  it("limite por hora por livro, contando rascunhos", async () => {
    for (let i = 0; i < 20; i++) await criada({ aparelho: ap(100 + i) });
    expect(await criar({ aparelho: ap(999) })).toEqual({
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

  it("duração acima de 5 min e 10 s é recusada", async () => {
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
    expect(valor(await reservar(m.id))).toEqual({
      caminho: m.audio_caminho,
      livro: livroA,
    });
    expect(valor(await reservar(m.id))).toEqual({ espera: true });
    expect(await reservar(m.id, ap(2))).toEqual({
      erro: "mensagem_nao_encontrada",
    });
    expect(valor(await transcrita(m.id, "primeira"))).toBe(true);
    expect(valor(await transcrita(m.id, "segunda"))).toBe(false);
    expect(valor(await reservar(m.id))).toEqual({ texto: "primeira" });
  });

  it("no máximo 3 tentativas de transcrição por mensagem", async () => {
    const m = await criada();
    valor(await confirmarAudio(m.id));
    for (let i = 0; i < 3; i++) {
      expect(valor(await reservar(m.id))).toMatchObject({
        caminho: m.audio_caminho,
      });
      valor(
        await servico(
          `select public.servico_mensagem_transcricao_falhou($1, $2, $3)`,
          [tokenA, ap(1), m.id],
        ),
      );
    }
    expect(await reservar(m.id)).toEqual({ erro: "limite_transcricao" });
  });

  it("enviar: outro aparelho não envia; áudio que não chegou trava; foto que não chegou cai", async () => {
    const m = await criada({ foto: true });
    expect(await enviar(m.id, "oi", ap(2))).toEqual({
      erro: "mensagem_nao_encontrada",
    });
    expect(await enviar(m.id, "oi")).toEqual({ erro: "audio_nao_chegou" });
    valor(await confirmarAudio(m.id));
    valor(await reservar(m.id));
    valor(await transcrita(m.id, "oi tio"));
    expect(valor(await enviar(m.id, "Oi, tio!"))).toEqual({
      id: m.id,
      livro: livroA,
      audio: true,
      foto: false,
      alterou: true,
    });
    const [r] = await sql(
      `select estado, texto, texto_enviado, foto_caminho from public.family_messages where id = $1`,
      [m.id],
    );
    expect(r).toEqual({
      estado: "enviada",
      texto: "Oi, tio!",
      texto_enviado: "Oi, tio!",
      foto_caminho: null,
    });
    expect(await enviar(m.id, "de novo")).toEqual({
      erro: "mensagem_nao_encontrada",
    });
  });

  it("sem áudio, precisa de texto; com áudio, pode ir sem texto", async () => {
    const t = await criada({ audio: null });
    expect(await enviar(t.id, "  ")).toEqual({ erro: "mensagem_sem_texto" });
    expect(valor(await enviar(t.id, "Saudade!"))).toMatchObject({
      audio: false,
      alterou: false,
    });
    const a = await criada();
    valor(await confirmarAudio(a.id));
    expect(valor(await enviar(a.id, null))).toMatchObject({ audio: true });
  });

  it("texto acima do limite é recusado", async () => {
    const t = await criada({ audio: null });
    expect(await enviar(t.id, "a".repeat(6001))).toEqual({
      erro: "dados_invalidos",
    });
  });

  it("rascunho de mais de 48 h não é mais do aparelho", async () => {
    const m = await criada();
    await db.exec(`
      alter table public.family_messages disable trigger family_messages_regras;
      update public.family_messages set criado_em = now() - interval '49 hours';
      alter table public.family_messages enable trigger family_messages_regras;`);
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
      await comoMembro(ana, `select public.mensagem_arquivar($1, true)`, [id]),
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

  it("sem texto não entra no livro; texto vazio não é aceito", async () => {
    const m = await criada();
    valor(await confirmarAudio(m.id));
    valor(await enviar(m.id, null));
    expect(
      await comoMembro(ana, `select public.mensagem_no_livro($1, true)`, [
        m.id,
      ]),
    ).toEqual({
      erro: "mensagem_sem_texto",
    });
    expect(
      await comoMembro(ana, `select public.mensagem_editar($1, ' ')`, [m.id]),
    ).toEqual({
      erro: "mensagem_sem_texto",
    });
  });

  it("outro livro, rascunho e plano vencido são barrados", async () => {
    const id = await enviada();
    expect(
      await comoMembro(beto, `select public.mensagem_editar($1, 'x')`, [id]),
    ).toEqual({
      erro: "sem_permissao",
    });
    const r = await criada();
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

  it.each([
    ["texto_enviado", `texto_enviado = 'outro'`],
    ["transcricao", `transcricao = 'outra'`],
    ["nome", `nome = 'Outro'`],
    [
      "volta a rascunho",
      `estado = 'rascunho', enviada_em = null, texto = null, texto_enviado = null`,
    ],
    ["áudio", `audio_caminho = null`],
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
    const id = await enviada();
    await db.exec(`
      alter table public.family_messages disable trigger family_messages_regras;
      update public.family_messages set criado_em = now() - interval '49 hours' where id in ('${velho.id}', '${id}');
      alter table public.family_messages enable trigger family_messages_regras;`);
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
      `select id from public.family_messages order by id`,
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
