// O autor nunca alcança causos, enquete nem o link da família — por privilégio, não por convenção.
// As funções autor_* do prompt 5 terão dono porta_autor; este teste já prova o mecanismo.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ativarPlano, como, criarBanco, criarUsuario, tenta } from "./banco";

// family_messages entrou no prompt 10 (vazia; as colunas chegam no prompt 12).
const TABELAS_DA_FAMILIA = [
  "polls",
  "poll_items",
  "poll_votes",
  "causos",
  "family_access",
  "family_messages",
];

let db: PGlite;
let livro: string;

beforeAll(async () => {
  db = await criarBanco();
  const ana = await criarUsuario(db, "ana@exemplo.com");
  livro = await ativarPlano(db, ana, "Jair");
  await db.query(
    `insert into public.causos (book_id, nome, texto, consentimento_em, consentimento_versao) values ($1, 'Ana', 'segredo da família', now(), 1)`,
    [livro],
  );
});

afterAll(async () => {
  await db.close();
});

describe("papel porta_autor", () => {
  it.each(TABELAS_DA_FAMILIA)("não tem nenhum privilégio em %s", async (t) => {
    const r = await db.query<{ algum: boolean }>(
      `select has_table_privilege('porta_autor', $1, 'select, insert, update, delete') as algum`,
      [`public.${t}`],
    );
    expect(r.rows[0].algum).toBe(false);
  });

  it("uma função autor_* com dono porta_autor que lê causos é negada", async () => {
    await db.exec(`
      create function public.autor_teste() returns bigint
      language sql security definer set search_path = '' as 'select count(*) from public.causos';
      alter function public.autor_teste() owner to porta_autor;
    `);
    const r = await como(db, "anon", {}, (tx) =>
      tenta(tx, `select public.autor_teste()`),
    );
    await db.exec(`drop function public.autor_teste()`);
    expect(r.erro).toMatch(/permission denied/);
  });
});

describe("complementar: corpo das funções do autor", () => {
  async function funcoesDoAutorQueCitam() {
    const r = await db.query<{ nome: string }>(
      `select n.nspname || '.' || p.proname as nome from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'privado')
         and (p.proname like 'autor\\_%' or p.proname like '%\\_autor' or p.proowner = 'porta_autor'::regrole)
         and p.prosrc ~* $1`,
      [`\\m(${TABELAS_DA_FAMILIA.join("|")})\\M`],
    );
    return r.rows.map((x) => x.nome);
  }

  it("nenhuma função do autor (pelo nome ou pelo dono) cita as tabelas da família", async () => {
    expect(await funcoesDoAutorQueCitam()).toEqual([]);
  });

  it("o detector pega uma função que cita causos", async () => {
    await db.exec(
      `create function public.autor_detector() returns int language sql as 'select 1 /* public.causos */'`,
    );
    const achadas = await funcoesDoAutorQueCitam();
    await db.exec(`drop function public.autor_detector()`);
    expect(achadas).toEqual(["public.autor_detector"]);
  });
});

describe("anon (o token do autor chega como anon)", () => {
  it.each(TABELAS_DA_FAMILIA)("sem grant em %s", async (t) => {
    const r = await db.query<{ algum: boolean }>(
      `select has_table_privilege('anon', $1, 'select, insert, update, delete') as algum`,
      [`public.${t}`],
    );
    expect(r.rows[0].algum).toBe(false);
  });
});

describe("dono e privilégios de porta_autor (T29)", () => {
  it("toda função que recebe o token do autor tem dono porta_autor", async () => {
    const r = await db.query<{ nome: string; dono: string }>(
      `select n.nspname || '.' || p.proname as nome, pg_get_userbyid(p.proowner) as dono
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'privado')
         and (p.proname like 'autor\\_%' or p.proname in ('acesso_do_autor', 'servico_caminho_gravacao_autor'))
       order by 1`,
    );
    expect(r.rows).toEqual([
      { nome: "privado.acesso_do_autor", dono: "porta_autor" },
      { nome: "public.autor_consentir", dono: "porta_autor" },
      { nome: "public.autor_pagina", dono: "porta_autor" },
      { nome: "public.autor_preparar_gravacao", dono: "porta_autor" },
      { nome: "public.servico_caminho_gravacao_autor", dono: "porta_autor" },
    ]);
  });

  it("porta_autor tem exatamente estes privilégios por coluna", async () => {
    const r = await db.query<{ p: string }>(
      `select table_name || '.' || column_name || ':' || privilege_type as p
       from information_schema.column_privileges
       where grantee = 'porta_autor' and table_schema = 'public' order by 1`,
    );
    expect(r.rows.map((x) => x.p)).toEqual(
      [
        ...["id", "book_id", "token_hash", "revogado_em"].map(
          (c) => `author_access.${c}:SELECT`,
        ),
        ...["id", "autor_nome", "autor_apelido", "autor_consentimento_em"].map(
          (c) => `books.${c}:SELECT`,
        ),
        ...["autor_consentimento_em", "autor_consentimento_versao"].map(
          (c) => `books.${c}:UPDATE`,
        ),
        ...["id", "book_id", "caminho"].map((c) => `photos.${c}:SELECT`),
        ...[
          "id",
          "book_id",
          "tipo",
          "texto",
          "estado",
          "photo_id",
          "sugestao_nome",
          "sugestao_audio_caminho",
          "enviada_em",
          "ordem",
        ].map((c) => `prompts.${c}:SELECT`),
        ...[
          "id",
          "book_id",
          "origem",
          "prompt_id",
          "nome_arquivo",
          "caminho",
          "content_type",
          "tamanho_bytes",
          "duracao_s",
          "author_access_id",
          "criado_por",
        ].map((c) => `recordings.${c}:INSERT`),
        ...[
          "id",
          "book_id",
          "origem",
          "upload",
          "caminho",
          "tamanho_bytes",
          "criado_em",
          "author_access_id",
        ].map((c) => `recordings.${c}:SELECT`),
      ].sort(),
    );
  });

  it("porta_autor não tem privilégio de tabela inteira", async () => {
    const r = await db.query(
      `select table_name, privilege_type from information_schema.role_table_grants
       where grantee = 'porta_autor' and table_schema = 'public'`,
    );
    expect(r.rows).toEqual([]);
  });
});
