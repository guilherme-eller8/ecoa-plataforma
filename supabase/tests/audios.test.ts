// Áudios recebidos (prompt 5A): um livro nunca lê nem cria áudio de outro, ninguém logado
// altera ou apaga, e só o servidor confirma o upload (ligando a pergunta, se houver).
import type { PGlite } from "@electric-sql/pglite";
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
let ana: string; // responsável do livro A
let beto: string; // responsável do livro B
let livroA: string;
let livroB: string;
let perguntaA: string;
let perguntaB: string;

const MB = 1024 * 1024;
const caminho = (livro: string, id: string, ext = "opus") =>
  `livros/${livro}/audios/${id}.${ext}`;

const sessao = <T>(usuario: string, fn: Parameters<typeof como<T>>[3]) =>
  como(db, "authenticated", { sub: usuario }, fn);

async function novaPergunta(usuario: string, livro: string, texto: string) {
  return sessao(usuario, async (tx) => {
    const id = crypto.randomUUID();
    await tx.query(
      `insert into public.prompts (book_id, tipo, texto, origem) values ($1, 'pergunta', $2, 'propria')`,
      [livro, texto],
    );
    const r = await tx.query<{ id: string }>(
      `select id from public.prompts where book_id = $1 and texto = $2`,
      [livro, texto],
    );
    return r.rows[0]?.id ?? id;
  });
}

/** Insere a linha "enviando" como o servidor faz, com a sessão do usuário. */
function inserir(
  usuario: string,
  livro: string,
  campos: {
    id?: string;
    caminho?: string;
    tamanho?: number;
    prompt?: string | null;
    origem?: string;
    lote?: string | null;
  } = {},
) {
  const id = campos.id ?? crypto.randomUUID();
  return sessao(usuario, async (tx) => ({
    id,
    r: await tenta(
      tx,
      `insert into public.recordings (id, book_id, origem, prompt_id, nome_arquivo, caminho, content_type, tamanho_bytes, duracao_s, lote_id)
       values ($1, $2, $3::public.recording_origem, $4, 'PTT-0001.opus', $5, 'audio/ogg', $6, 42, $7)`,
      [
        id,
        livro,
        campos.origem ?? "upload",
        campos.prompt ?? null,
        campos.caminho ?? caminho(livro, id),
        campos.tamanho ?? 2 * MB,
        campos.lote ?? null,
      ],
    ),
  }));
}

async function confirmar(id: string, tamanho = 2 * MB) {
  return como(db, "service_role", {}, async (tx) => {
    const r = await tx.query<{ ok: boolean }>(
      `select public.servico_confirmar_audio($1, $2) as ok`,
      [id, tamanho],
    );
    return r.rows[0].ok;
  });
}

async function visiveis(usuario: string, livro: string) {
  return sessao(usuario, async (tx) => {
    const r = await tx.query<{ id: string }>(
      `select id from public.recordings where book_id = $1`,
      [livro],
    );
    return r.rows.map((x) => x.id);
  });
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Jair");
  livroB = await ativarPlano(db, beto, "Odete");
  perguntaA = await novaPergunta(ana, livroA, "Como você conheceu a mamãe?");
  perguntaB = await novaPergunta(beto, livroB, "Onde a senhora nasceu?");
});
afterAll(async () => {
  await db.close();
});

describe("subir e confirmar", () => {
  it("a linha enviando fica invisível até o servidor confirmar", async () => {
    const { id, r } = await inserir(ana, livroA);
    expect(r.erro).toBeUndefined();
    expect(await visiveis(ana, livroA)).not.toContain(id);
    expect(await confirmar(id)).toBe(true);
    expect(await visiveis(ana, livroA)).toContain(id);
  });

  it("não confirma com tamanho diferente nem duas vezes", async () => {
    const { id } = await inserir(ana, livroA);
    expect(await confirmar(id, 3 * MB)).toBe(false);
    expect(await confirmar(id)).toBe(true);
    expect(await confirmar(id)).toBe(false);
  });

  it("a pergunta ligada passa para respondida", async () => {
    const { id, r } = await inserir(ana, livroA, { prompt: perguntaA });
    expect(r.erro).toBeUndefined();
    expect(await confirmar(id)).toBe(true);
    const e = await db.query<{ estado: string }>(
      `select estado from public.prompts where id = $1`,
      [perguntaA],
    );
    expect(e.rows[0].estado).toBe("respondida");
  });

  it("o membro cria upload, lote e conversa; autor e livre só pelo link", async () => {
    const lote = crypto.randomUUID();
    expect(
      (await inserir(ana, livroA, { origem: "conversa" })).r.erro,
    ).toBeUndefined();
    expect(
      (await inserir(ana, livroA, { origem: "conversa", lote })).r.erro,
    ).toBeUndefined();
    expect(
      (await inserir(ana, livroA, { origem: "lote", lote })).r.erro,
    ).toBeUndefined();
    expect((await inserir(ana, livroA, { origem: "lote" })).r.erro).toMatch(
      /recordings_lote_tem_id/,
    );
    expect(
      (await inserir(ana, livroA, { origem: "upload", lote })).r.erro,
    ).toMatch(/recordings_lote_so_em_lote_ou_conversa/);
    for (const origem of ["autor", "livre"])
      expect((await inserir(ana, livroA, { origem })).r.erro).toMatch(
        /row-level security|recordings_autor_tem_link/,
      );
  });
});

describe("isolamento entre livros", () => {
  it("A não cria áudio no livro B", async () => {
    const { r } = await inserir(ana, livroB);
    expect(r.erro).toMatch(/row-level security/);
  });

  it("A não lê os áudios de B", async () => {
    const { id } = await inserir(beto, livroB);
    await confirmar(id);
    expect(await visiveis(beto, livroB)).toContain(id);
    expect(await visiveis(ana, livroB)).toEqual([]);
  });

  it("A não liga o próprio áudio a uma pergunta de B", async () => {
    const { r } = await inserir(ana, livroA, { prompt: perguntaB });
    expect(r.erro).toMatch(/foreign key/);
  });

  it("caminho de outro livro é recusado", async () => {
    const id = crypto.randomUUID();
    const { r } = await inserir(ana, livroA, {
      id,
      caminho: caminho(livroB, id),
    });
    expect(r.erro).toMatch(/recordings_caminho_do_livro/);
  });

  it("caminho com '..' ou extensão estranha é recusado", async () => {
    const id = crypto.randomUUID();
    for (const c of [
      `livros/${livroA}/audios/../${id}.opus`,
      `livros/${livroA}/audios/${id}.exe`,
      `livros/${livroA}/audios/${id}.opus.html`,
    ]) {
      const { r } = await inserir(ana, livroA, { id, caminho: c });
      expect(r.erro).toMatch(/recordings_caminho_do_livro/);
    }
  });
});

describe("limites e plano", () => {
  it("arquivo acima de 50 MB é recusado", async () => {
    const { r } = await inserir(ana, livroA, { tamanho: 50 * MB + 1 });
    expect(r.erro).toMatch(/tamanho_bytes/);
  });

  it("50 MB exatos passam", async () => {
    const { r } = await inserir(ana, livroA, { tamanho: 50 * MB });
    expect(r.erro).toBeUndefined();
  });

  it("livro com plano vencido não recebe áudio", async () => {
    const carla = await criarUsuario(db, "carla@exemplo.com");
    const livroC = await ativarPlano(db, carla, "Zé");
    await vencerPlano(db, livroC);
    const { r } = await inserir(carla, livroC);
    expect(r.erro).toMatch(/row-level security/);
  });
});

describe("ninguém logado altera ou apaga", () => {
  it("authenticated não altera nem apaga o próprio áudio", async () => {
    const { id } = await inserir(ana, livroA);
    await confirmar(id);
    await sessao(ana, async (tx) => {
      expect(
        (
          await tenta(
            tx,
            `update public.recordings set titulo = 'x' where id = $1`,
            [id],
          )
        ).erro,
      ).toMatch(/permission denied/);
      expect(
        (await tenta(tx, `delete from public.recordings where id = $1`, [id]))
          .erro,
      ).toMatch(/permission denied/);
      expect(
        (
          await tenta(
            tx,
            `update public.recordings set upload = 'recebido', recebido_em = now() where id = $1`,
            [id],
          )
        ).erro,
      ).toMatch(/permission denied/);
    });
  });

  it("authenticated não confirma upload", async () => {
    const { id } = await inserir(ana, livroA);
    const r = await sessao(ana, (tx) =>
      tenta(tx, `select public.servico_confirmar_audio($1, $2)`, [id, 2 * MB]),
    );
    expect(r.erro).toMatch(/permission denied/);
  });

  it("anon não alcança a tabela", async () => {
    const r = await como(db, "anon", {}, (tx) =>
      tenta(tx, `select id from public.recordings`),
    );
    expect(r.erro).toMatch(/permission denied/);
  });

  it("porta_autor não lê título nem áudio que não veio do link do autor", async () => {
    const titulo = await como(db, "porta_autor", {}, (tx) =>
      tenta(tx, `select titulo from public.recordings`),
    );
    expect(titulo.erro).toMatch(/permission denied/);
    const linhas = await db.transaction(async (tx) => {
      await tx.query(`select set_config('ecoa.livro', $1, true)`, [livroA]);
      await tx.exec(`set local role porta_autor`);
      return (await tx.query(`select id from public.recordings`)).rows;
    });
    expect(linhas).toEqual([]);
  });
});
