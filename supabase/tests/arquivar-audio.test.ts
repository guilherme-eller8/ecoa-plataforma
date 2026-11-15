// Arquivar áudio (P69): qualquer membro que escreve arquiva e desarquiva; o áudio nunca é
// apagado; a história e o QR de um áudio arquivado continuam como estão; outro livro e o autor
// não alcançam a função.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ativarPlano, como, criarBanco, criarUsuario, tenta } from "./banco";

let db: PGlite;
let ana: string;
let beto: string;
let livroA: string;

const MB = 1024 * 1024;
const sessao = <T>(usuario: string, fn: Parameters<typeof como<T>>[3]) =>
  como(db, "authenticated", { sub: usuario }, fn);

/** Um áudio já recebido (o que o servidor deixa depois de confirmar o upload). */
async function audioRecebido(livro: string) {
  const id = crypto.randomUUID();
  await db.query(
    `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type,
       tamanho_bytes, duracao_s, upload, recebido_em)
     values ($1, $2, 'upload', 'PTT-0001.opus', $3, 'audio/ogg', $4, 42, 'recebido', now())`,
    [id, livro, `livros/${livro}/audios/${id}.opus`, 2 * MB],
  );
  return id;
}

async function comHistoria(livro: string, gravacao: string) {
  const s = await db.query<{ id: string }>(
    `insert into public.stories (book_id, estado, pronta_em, titulo)
     values ($1, 'pronta', now(), 'O trem') returning id`,
    [livro],
  );
  await db.query(
    `insert into public.story_recordings (story_id, recording_id, book_id, ordem) values ($1, $2, $3, 1)`,
    [s.rows[0].id, gravacao, livro],
  );
  await db.query(
    `update public.recordings set processado_em = now() where id = $1`,
    [gravacao],
  );
  return s.rows[0].id;
}

const arquivar = (usuario: string, livro: string, id: string, sim: boolean) =>
  sessao(usuario, (tx) =>
    tenta(tx, `select public.audio_arquivar($1, $2, $3)`, [livro, id, sim]),
  );

const linha = async (id: string) =>
  (
    await db.query<{
      arquivado_em: string | null;
      processado_em: string | null;
    }>(
      `select arquivado_em, processado_em from public.recordings where id = $1`,
      [id],
    )
  ).rows[0];

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

describe("áudio que ainda não virou história", () => {
  it("arquiva e sai da fila; desarquivar o devolve à fila", async () => {
    const id = await audioRecebido(livroA);
    expect((await arquivar(ana, livroA, id, true)).erro).toBeUndefined();
    const a = await linha(id);
    expect(a.arquivado_em).not.toBeNull();
    expect(a.processado_em).toEqual(a.arquivado_em);

    const volta = await sessao(ana, async (tx) => {
      const r = await tx.query<{ f: boolean }>(
        `select public.audio_arquivar($1, $2, false) as f`,
        [livroA, id],
      );
      return r.rows[0].f;
    });
    expect(volta).toBe(true); // o servidor dispara o processamento de novo
    const b = await linha(id);
    expect(b.arquivado_em).toBeNull();
    expect(b.processado_em).toBeNull();
  });
});

describe("áudio que já virou história", () => {
  it("arquiva sem tocar na história, no vínculo nem na marca de processado", async () => {
    const id = await audioRecebido(livroA);
    const historia = await comHistoria(livroA, id);
    const antes = await linha(id);
    expect((await arquivar(ana, livroA, id, true)).erro).toBeUndefined();
    const depois = await linha(id);
    expect(depois.arquivado_em).not.toBeNull();
    expect(depois.processado_em).toEqual(antes.processado_em);
    const v = await db.query(
      `select 1 from public.story_recordings where story_id = $1 and recording_id = $2`,
      [historia, id],
    );
    expect(v.rows).toHaveLength(1);
    const h = await db.query<{ estado: string }>(
      `select estado from public.stories where id = $1`,
      [historia],
    );
    expect(h.rows[0].estado).toBe("pronta");
  });

  it("desarquivar não reprocessa: a história continua sendo a mesma", async () => {
    const id = await audioRecebido(livroA);
    await comHistoria(livroA, id);
    await arquivar(ana, livroA, id, true);
    const volta = await sessao(ana, async (tx) => {
      const r = await tx.query<{ f: boolean }>(
        `select public.audio_arquivar($1, $2, false) as f`,
        [livroA, id],
      );
      return r.rows[0].f;
    });
    expect(volta).toBe(false);
    const a = await linha(id);
    expect(a.arquivado_em).toBeNull();
    expect(a.processado_em).not.toBeNull();
  });
});

describe("quem pode", () => {
  it("outro livro não arquiva áudio daqui", async () => {
    const id = await audioRecebido(livroA);
    expect((await arquivar(beto, livroA, id, true)).erro).toBeDefined();
    expect((await linha(id)).arquivado_em).toBeNull();
  });

  it("o id de um áudio de outro livro não funciona com o livro certo", async () => {
    const id = await audioRecebido(livroA);
    const livroB = (
      await db.query<{ id: string }>(
        `select id from public.books where id <> $1 limit 1`,
        [livroA],
      )
    ).rows[0].id;
    expect((await arquivar(beto, livroB, id, true)).erro).toBeDefined();
  });

  it("ninguém logado edita a coluna direto, nem apaga o áudio", async () => {
    const id = await audioRecebido(livroA);
    const r = await sessao(ana, (tx) =>
      tenta(
        tx,
        `update public.recordings set arquivado_em = now() where id = $1`,
        [id],
      ),
    );
    expect(r.erro).toBeDefined();
    const d = await sessao(ana, (tx) =>
      tenta(tx, `delete from public.recordings where id = $1`, [id]),
    );
    expect(d.erro).toBeDefined();
  });

  it("o autor e quem não tem login não executam a função", async () => {
    const id = await audioRecebido(livroA);
    for (const papel of ["anon", "porta_autor"] as const) {
      const r = await como(db, papel, {}, (tx) =>
        tenta(tx, `select public.audio_arquivar($1, $2, true)`, [livroA, id]),
      );
      expect(r.erro).toBeDefined();
    }
  });
});
