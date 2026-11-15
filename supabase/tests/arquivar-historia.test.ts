// Arquivar história (P71): qualquer membro que escreve arquiva e desarquiva; a história sai das
// listas e da montagem, mas nada é apagado (texto, vínculo com o áudio); só história pronta ou
// que falhou; outro livro, o autor e quem não tem login não alcançam a função.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ativarPlano, como, criarBanco, criarUsuario, tenta } from "./banco";

let db: PGlite;
let ana: string;
let beto: string;
let livroA: string;

const sessao = <T>(usuario: string, fn: Parameters<typeof como<T>>[3]) =>
  como(db, "authenticated", { sub: usuario }, fn);

async function historia(livro: string, estado = "pronta") {
  const r = await db.query<{ id: string }>(
    `insert into public.stories (book_id, estado, pronta_em, titulo, ano, revisada_em, texto, erro_etapa)
     values ($1, $2::public.story_estado, case when $2 = 'pronta' then now() end, 'O trem', 1962, now(),
       '{"titulo": "O trem", "paragrafos": [{"id": "p1", "texto": "Eu peguei o trem em 1962.", "fontes": ["s1"]}]}',
       case when $2 = 'falhou' then 'escrever' end)
     returning id`,
    [livro, estado],
  );
  return r.rows[0].id;
}

const arquivar = (usuario: string, livro: string, id: string, sim: boolean) =>
  sessao(usuario, (tx) =>
    tenta(tx, `select public.historia_arquivar($1, $2, $3)`, [livro, id, sim]),
  );

const naMontagem = async (livro: string) =>
  sessao(ana, async (tx) => {
    const r = await tx.query<{ c: { historias: { id: string }[] } }>(
      `select public.montagem_conteudo($1) as c`,
      [livro],
    );
    return r.rows[0].c.historias.map((h) => h.id);
  });

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Jair");
  await ativarPlano(db, beto, "Odete");
});
afterAll(async () => {
  await db.close();
});

describe("arquivar e desarquivar", () => {
  it("sai da montagem e volta, sem apagar nada", async () => {
    const id = await historia(livroA);
    expect(await naMontagem(livroA)).toContain(id);

    expect((await arquivar(ana, livroA, id, true)).erro).toBeUndefined();
    expect(await naMontagem(livroA)).not.toContain(id);
    const viva = await db.query<{
      texto: unknown;
      arquivada_em: string | null;
    }>(`select texto, arquivada_em from public.stories where id = $1`, [id]);
    expect(viva.rows[0].arquivada_em).not.toBeNull();
    expect(viva.rows[0].texto).not.toBeNull(); // o texto continua lá

    expect((await arquivar(ana, livroA, id, false)).erro).toBeUndefined();
    expect(await naMontagem(livroA)).toContain(id);
  });

  it("arquivar duas vezes é inofensivo e guarda a primeira data", async () => {
    const id = await historia(livroA);
    await arquivar(ana, livroA, id, true);
    const a = await db.query<{ t: string }>(
      `select arquivada_em::text as t from public.stories where id = $1`,
      [id],
    );
    await arquivar(ana, livroA, id, true);
    const b = await db.query<{ t: string }>(
      `select arquivada_em::text as t from public.stories where id = $1`,
      [id],
    );
    expect(b.rows[0].t).toBe(a.rows[0].t);
  });

  it("uma história que falhou também arquiva; uma em andamento não", async () => {
    const falhou = await historia(livroA, "falhou");
    const andando = await historia(livroA, "escrevendo");
    expect((await arquivar(ana, livroA, falhou, true)).erro).toBeUndefined();
    expect((await arquivar(ana, livroA, andando, true)).erro).toContain(
      "dados_invalidos",
    );
  });
});

describe("quem pode", () => {
  it("outro livro não arquiva história daqui, nem com o id certo no livro errado", async () => {
    const id = await historia(livroA);
    expect((await arquivar(beto, livroA, id, true)).erro).toBeDefined();
    const livroB = (
      await db.query<{ id: string }>(
        `select id from public.books where id <> $1 limit 1`,
        [livroA],
      )
    ).rows[0].id;
    expect((await arquivar(beto, livroB, id, true)).erro).toBeDefined();
    const r = await db.query<{ arquivada_em: string | null }>(
      `select arquivada_em from public.stories where id = $1`,
      [id],
    );
    expect(r.rows[0].arquivada_em).toBeNull();
  });

  it("ninguém logado edita a coluna direto, nem apaga a história", async () => {
    const id = await historia(livroA);
    const u = await sessao(ana, (tx) =>
      tenta(
        tx,
        `update public.stories set arquivada_em = now() where id = $1`,
        [id],
      ),
    );
    expect(u.erro).toBeDefined();
    const d = await sessao(ana, (tx) =>
      tenta(tx, `delete from public.stories where id = $1`, [id]),
    );
    expect(d.erro).toBeDefined();
  });

  it("o autor e quem não tem login não executam a função", async () => {
    const id = await historia(livroA);
    for (const papel of ["anon", "porta_autor"] as const) {
      const r = await como(db, papel, {}, (tx) =>
        tenta(tx, `select public.historia_arquivar($1, $2, true)`, [
          livroA,
          id,
        ]),
      );
      expect(r.erro).toBeDefined();
    }
  });
});
