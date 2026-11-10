// Link do autor (prompt 5): o token só alcança o próprio livro, grava com consentimento e
// dentro dos tetos (T29), repetir é seguro, e só o servidor confirma.
import type { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ativarPlano,
  como,
  criarBanco,
  criarUsuario,
  tenta,
  vencerPlano,
} from "./banco";

let db: PGlite;
let ana: string;
let beto: string;
let livroA: string;
let livroB: string;
const tokenA = "v1_tokenDoAutorDoLivroA0";
let tokenB = "v1_tokenDoAutorDoLivroB0";
const hash = (t: string) =>
  createHash("sha256").update(t, "utf8").digest("hex");
const KB = 1024;

async function trocarLink(livro: string, usuario: string, token: string) {
  await como(db, "service_role", {}, (tx) =>
    tx.query(
      `select public.servico_trocar_link_autor($1, $2, gen_random_uuid(), $3, 1::smallint)`,
      [livro, usuario, hash(token)],
    ),
  );
}

async function pergunta(livro: string, estado: string, causo?: string) {
  const r = await db.query<{ id: string }>(
    `insert into public.prompts (book_id, tipo, texto, origem, causo_id, estado)
     values ($1, 'pergunta', 'Como foi a infância?', $2::public.prompt_origem, $3, $4::public.prompt_estado) returning id`,
    [livro, causo ? "causo" : "propria", causo ?? null, estado],
  );
  return r.rows[0].id;
}

const anon = <T>(sql: string, args: unknown[] = []) =>
  como(db, "anon", {}, (tx) => tenta(tx, sql, args)) as Promise<
    { erro?: string } & T
  >;

async function preparar(
  token: string,
  campos: {
    id?: string;
    prompt?: string | null;
    ext?: string | null;
    bytes?: number;
    s?: number;
  } = {},
) {
  const id = campos.id ?? crypto.randomUUID();
  const r = await como(db, "anon", {}, async (tx) => {
    await tx.exec("savepoint p");
    try {
      const q = await tx.query<{
        r: { id: string; caminho: string; recebida: boolean };
      }>(`select public.autor_preparar_gravacao($1, $2, $3, $4, $5, $6) as r`, [
        token,
        id,
        campos.prompt ?? null,
        campos.ext === undefined ? "webm" : campos.ext,
        campos.bytes ?? 300 * KB,
        campos.s ?? 60,
      ]);
      await tx.exec("release savepoint p");
      return { dados: q.rows[0].r };
    } catch (e) {
      await tx.exec("rollback to savepoint p");
      return { erro: (e as Error).message };
    }
  });
  return { id, ...r };
}

async function consentir(token: string) {
  return como(db, "anon", {}, (tx) =>
    tx.query(`select public.autor_consentir($1, 1::smallint)`, [token]),
  );
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Jair");
  livroB = await ativarPlano(db, beto, "Zé");
  await trocarLink(livroA, ana, tokenA);
  await trocarLink(livroB, beto, tokenB);
});

afterAll(async () => {
  await db.close();
});

describe("página do autor", () => {
  it("token inválido devolve null", async () => {
    const r = await como(db, "anon", {}, (tx) =>
      tx.query<{ r: unknown }>(
        `select public.autor_pagina('v1_naoExisteNenhumLink0') as r`,
      ),
    );
    expect(r.rows[0].r).toBeNull();
  });

  it("mostra só as perguntas enviadas do próprio livro, com quem sugeriu", async () => {
    await db.query(
      `insert into public.causos (book_id, nome, texto, consentimento_em, consentimento_versao)
       values ($1, 'Ana', 'Guarapari', now(), 1)`,
      [livroA],
    );
    const causo = (
      await db.query<{ id: string }>(
        `select id from public.causos where book_id = $1`,
        [livroA],
      )
    ).rows[0].id;
    const enviada = await pergunta(livroA, "enviada", causo);
    await pergunta(livroA, "para_enviar");
    await pergunta(livroB, "enviada");
    const r = await como(db, "anon", {}, (tx) =>
      tx.query<{
        r: {
          nome: string;
          consentiu: boolean;
          perguntas: { id: string; sugestao_nome: string }[];
        };
      }>(`select public.autor_pagina($1) as r`, [tokenA]),
    );
    const p = r.rows[0].r;
    expect(p.nome).toBe("Jair");
    expect(p.consentiu).toBe(false);
    expect(p.perguntas.map((x) => x.id)).toEqual([enviada]);
    expect(p.perguntas[0].sugestao_nome).toBe("Ana");
  });

  it("o membro não escreve as colunas copiadas do causo", async () => {
    const r = await como(db, "authenticated", { sub: ana }, (tx) =>
      tenta(
        tx,
        `update public.prompts set sugestao_nome = 'Outro' where book_id = $1`,
        [livroA],
      ),
    );
    expect(r.erro).toMatch(/permission denied/);
  });
});

describe("preparar gravação", () => {
  it("sem consentimento é recusado", async () => {
    expect((await preparar(tokenA)).erro).toMatch(/sem_consentimento/);
  });

  it("com consentimento cria a linha 'enviando' no caminho do livro", async () => {
    await consentir(tokenA);
    await consentir(tokenB);
    const b = await db.query<{ autor_consentimento_versao: number }>(
      `select autor_consentimento_versao from public.books where id = $1`,
      [livroA],
    );
    expect(b.rows[0].autor_consentimento_versao).toBe(1);
    const r = await preparar(tokenA);
    expect(r.erro).toBeUndefined();
    expect(r.dados?.caminho).toBe(`livros/${livroA}/audios/${r.id}.webm`);
    const linha = await db.query<{ origem: string; upload: string }>(
      `select origem, upload from public.recordings where id = $1`,
      [r.id],
    );
    expect(linha.rows[0]).toEqual({ origem: "livre", upload: "enviando" });
  });

  it("repetir devolve a mesma linha; recebida volta marcada", async () => {
    const r1 = await preparar(tokenA);
    const r2 = await preparar(tokenA, { id: r1.id });
    expect(r2.dados).toEqual(r1.dados);
    await como(db, "service_role", {}, (tx) =>
      tx.query(`select public.servico_confirmar_gravacao_autor($1, $2, $3)`, [
        tokenA,
        r1.id,
        300 * KB,
      ]),
    );
    expect((await preparar(tokenA, { id: r1.id })).dados?.recebida).toBe(true);
  });

  it("linha com mais de 7 dias pede id novo", async () => {
    const r = await preparar(tokenA);
    await db.query(
      `update public.recordings set criado_em = now() - interval '8 days' where id = $1`,
      [r.id],
    );
    expect((await preparar(tokenA, { id: r.id })).erro).toMatch(
      /gravacao_expirada/,
    );
  });

  it("id de gravação de outro livro é recusado", async () => {
    const deB = await preparar(tokenB);
    expect((await preparar(tokenA, { id: deB.id })).erro).toMatch(
      /dados_invalidos/,
    );
  });

  it("pergunta não enviada ou de outro livro é recusada; enviada vira 'autor'", async () => {
    const pendente = await pergunta(livroA, "para_enviar");
    const deB = await pergunta(livroB, "enviada");
    const enviada = await pergunta(livroA, "enviada");
    expect((await preparar(tokenA, { prompt: pendente })).erro).toMatch(
      /pergunta_invalida/,
    );
    expect((await preparar(tokenA, { prompt: deB })).erro).toMatch(
      /pergunta_invalida/,
    );
    const ok = await preparar(tokenA, { prompt: enviada });
    expect(ok.erro).toBeUndefined();
    const o = await db.query<{ origem: string }>(
      `select origem from public.recordings where id = $1`,
      [ok.id],
    );
    expect(o.rows[0].origem).toBe("autor");
  });

  it.each([
    ["extensão nula", { ext: null }],
    ["extensão ogg", { ext: "ogg" }],
    ["tamanho incoerente com a duração", { bytes: 40 * 1024 * KB, s: 10 }],
    ["duração acima de 31 min", { s: 31 * 60 + 1 }],
  ])("%s é recusado", async (_n, campos) => {
    expect((await preparar(tokenA, campos)).erro).toMatch(/dados_invalidos/);
  });

  it("token trocado para de funcionar", async () => {
    const novo = "v1_linkNovoDoLivroB0000";
    await trocarLink(livroB, beto, novo);
    expect((await preparar(tokenB)).erro).toMatch(/link_invalido/);
    tokenB = novo;
  });

  it("livro fechado não aceita gravação", async () => {
    const zeca = await criarUsuario(db, "zeca@exemplo.com");
    const livro = await ativarPlano(db, zeca, "Lia");
    const token = "v1_tokenDoLivroFechado0";
    await trocarLink(livro, zeca, token);
    await consentir(token);
    await vencerPlano(db, livro);
    expect((await preparar(token)).erro).toMatch(/livro_fechado/);
  });

  it("no máximo 5 envios abertos por livro", async () => {
    const carla = await criarUsuario(db, "carla@exemplo.com");
    const livro = await ativarPlano(db, carla, "Rui");
    const token = "v1_tokenDoLivroDoRui000";
    await trocarLink(livro, carla, token);
    await consentir(token);
    for (let i = 0; i < 5; i++)
      expect((await preparar(token)).erro).toBeUndefined();
    expect((await preparar(token)).erro).toMatch(/limite_gravacoes/);
  });
});

describe("servidor", () => {
  it("só assina o caminho da gravação do livro do token", async () => {
    const r = await preparar(tokenA);
    const caminho = (token: string) =>
      como(db, "service_role", {}, (tx) =>
        tx.query<{ c: string | null }>(
          `select public.servico_caminho_gravacao_autor($1, $2) as c`,
          [token, r.id],
        ),
      );
    expect((await caminho(tokenA)).rows[0].c).toBe(r.dados?.caminho);
    expect((await caminho(tokenB)).rows[0].c).toBeNull();
  });

  it("confirmar com token de outro livro é recusado", async () => {
    const r = await preparar(tokenA);
    const ok = await como(db, "service_role", {}, (tx) =>
      tx.query<{ ok: boolean }>(
        `select public.servico_confirmar_gravacao_autor($1, $2, $3) as ok`,
        [tokenB, r.id, 300 * KB],
      ),
    );
    expect(ok.rows[0].ok).toBe(false);
  });

  it("anon não chama as funções do servidor", async () => {
    const r = await anon(
      `select public.servico_caminho_gravacao_autor($1, gen_random_uuid())`,
      [tokenA],
    );
    expect(r.erro).toMatch(/permission denied/);
  });
});

describe("porta_autor com o livro A fixado", () => {
  async function lerComo(livro: string | null, sql: string) {
    return db.transaction(async (tx) => {
      if (livro)
        await tx.query(`select set_config('ecoa.livro', $1, true)`, [livro]);
      await tx.exec(`set local role porta_autor`);
      return (await tx.query<{ book_id: string }>(sql)).rows;
    });
  }

  it.each([
    ["books", "select id as book_id from public.books"],
    ["prompts", "select book_id from public.prompts"],
    ["photos", "select book_id from public.photos"],
    ["recordings", "select book_id from public.recordings"],
  ])("%s só mostra o livro A", async (_t, sql) => {
    const linhas = await lerComo(livroA, sql);
    expect(linhas.every((l) => l.book_id === livroA)).toBe(true);
    expect(await lerComo(null, sql)).toEqual([]);
  });
});
