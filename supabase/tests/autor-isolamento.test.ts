// O autor nunca alcança causos, enquete nem o link da família — por privilégio, não por convenção.
// As funções autor_* do prompt 5 terão dono porta_autor; este teste já prova o mecanismo.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ativarPlano, como, criarBanco, criarUsuario, tenta } from "./banco";

// O prompt 10 acrescenta family_messages a esta lista.
const TABELAS_DA_FAMILIA = [
  "polls",
  "poll_items",
  "poll_votes",
  "causos",
  "family_access",
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
       where n.nspname in ('public', 'privado') and p.proname like 'autor\\_%'
         and p.prosrc ~* $1`,
      [`\\m(${[...TABELAS_DA_FAMILIA, "family_messages"].join("|")})\\M`],
    );
    return r.rows.map((x) => x.nome);
  }

  it("nenhuma função autor_* cita as tabelas da família", async () => {
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
