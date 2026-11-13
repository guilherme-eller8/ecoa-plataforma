// Editor de histórias (prompt 8): trava, salvamento, versões, restaurar, fotos e "pronta".
// Design: docs/designs/editor-historias.md.
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
let caio: string; // co-facilitador do livro A
let beto: string; // responsável do livro B
let livroA: string;
let livroB: string;

const sessao = <T>(
  usuario: string,
  nome: string | null,
  fn: Parameters<typeof como<T>>[3],
) =>
  como(
    db,
    "authenticated",
    { sub: usuario, user_metadata: nome ? { full_name: nome } : {} },
    fn,
  );

async function historiaPronta(livro: string) {
  const r = await db.query<{ id: string }>(
    `insert into public.stories (book_id, estado, pronta_em, titulo) values ($1, 'pronta', now(), 'Da IA') returning id`,
    [livro],
  );
  const id = r.rows[0].id;
  await db.query(
    `insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo)
     values ($1, $2, 1, 'ia', 'medio', $3::jsonb)`,
    [
      id,
      livro,
      JSON.stringify({
        titulo: "Da IA",
        paragrafos: [{ texto: "Texto da IA.", fontes: [1] }],
        lacunas: [],
      }),
    ],
  );
  return id;
}

const conteudo = (texto: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    titulo: "Título novo",
    ano: 1962,
    paragrafos: [{ id: "p1", texto, fontes: [1, 2], editado: true }],
    lacunas: [],
    ...extra,
  });

type Trava = { editando: boolean; outra_tela: boolean; nome: string | null };
async function editar(
  usuario: string,
  nome: string,
  story: string,
  aba: string,
  pegar = true,
  assumir = false,
) {
  return sessao(usuario, nome, async (tx) => {
    const r = await tx.query<Trava>(
      `select * from public.editar_historia($1, $2, $3, $4)`,
      [story, aba, pegar, assumir],
    );
    return r.rows[0];
  });
}

async function salvar(
  usuario: string,
  story: string,
  aba: string,
  rev: number,
  texto: string | object,
) {
  return sessao(usuario, null, async (tx) => {
    const t = await tenta(
      tx,
      `select public.salvar_historia($1, $2, $3, $4::jsonb, '[]'::jsonb)`,
      [
        story,
        aba,
        rev,
        typeof texto === "string" ? conteudo(texto) : JSON.stringify(texto),
      ],
    );
    return t.erro ?? "ok";
  });
}

async function versoes(story: string) {
  const r = await db.query<{
    numero: number;
    origem: string;
    texto: string;
    restaurada_de: number | null;
  }>(
    `select numero, origem, conteudo->'paragrafos'->0->>'texto' as texto, restaurada_de
     from public.story_versions where story_id = $1 order by numero`,
    [story],
  );
  return r.rows;
}

const aba = () => crypto.randomUUID();

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  caio = await criarUsuario(db, "caio@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Jair");
  livroB = await ativarPlano(db, beto, "Zé");
  await db.query(
    `insert into public.book_members (book_id, user_id, papel) values ($1, $2, 'cofacilitador')`,
    [livroA, caio],
  );
});
afterAll(async () => {
  await db.close();
});

describe("trava de edição", () => {
  it("a primeira tela pega; outra pessoa vê o primeiro nome; ninguém de fora entra", async () => {
    const s = await historiaPronta(livroA);
    const a1 = aba();
    expect(await editar(ana, "Ana Souza", s, a1)).toEqual({
      editando: true,
      outra_tela: false,
      nome: null,
    });
    expect(await editar(caio, "Caio", s, aba(), false)).toEqual({
      editando: false,
      outra_tela: false,
      nome: "Ana",
    });
    // Só olhar não pega a trava, nem tenta assumir de outra pessoa.
    expect(await editar(caio, "Caio", s, aba(), true, true)).toEqual({
      editando: false,
      outra_tela: false,
      nome: "Ana",
    });
    await sessao(beto, "Beto", async (tx) => {
      expect(
        await tenta(tx, `select * from public.editar_historia($1, $2)`, [
          s,
          aba(),
        ]),
      ).toEqual({ erro: "sem_permissao" });
    });
  });

  it("a mesma pessoa em outra tela vê 'outra tela' e pode assumir; a sessão anterior vira versão", async () => {
    const s = await historiaPronta(livroA);
    const a1 = aba();
    const a2 = aba();
    await editar(ana, "Ana", s, a1);
    expect(await salvar(ana, s, a1, 0, "um")).toBe("ok");
    expect(await editar(ana, "Ana", s, a2)).toEqual({
      editando: false,
      outra_tela: true,
      nome: null,
    });
    expect(await salvar(ana, s, a2, 1, "dois")).toBe("trava_de_outro");
    expect((await editar(ana, "Ana", s, a2, true, true)).editando).toBe(true);
    expect((await versoes(s)).map((v) => v.texto)).toEqual([
      "Texto da IA.",
      "um",
    ]);
    expect(await salvar(ana, s, a1, 1, "velha")).toBe("trava_de_outro");
  });

  it("expira em 2 min: outra pessoa pega, e o texto pendente vira versão de quem escreveu", async () => {
    const s = await historiaPronta(livroA);
    const a1 = aba();
    await editar(ana, "Ana", s, a1);
    expect(await salvar(ana, s, a1, 0, "da ana")).toBe("ok");
    await db.query(
      `update public.edit_locks set expira_em = now() - interval '1 second' where story_id = $1`,
      [s],
    );
    expect((await editar(caio, "Caio", s, aba())).editando).toBe(true);
    const v = await versoes(s);
    expect(v.at(-1)).toMatchObject({ origem: "responsavel", texto: "da ana" });
  });

  it("ninguém lê edit_locks direto", async () => {
    await sessao(ana, "Ana", async (tx) => {
      expect(await tenta(tx, `select * from public.edit_locks`)).toEqual({
        erro: expect.stringMatching(/permission denied/),
      });
    });
  });
});

describe("salvar", () => {
  it("guarda o texto atual, o título e o ano, e recusa rev velha e conteúdo fora do formato", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await editar(caio, "Caio", s, a);
    expect(await salvar(caio, s, a, 0, "novo")).toBe("ok");
    expect(await salvar(caio, s, a, 0, "outro")).toBe("texto_desatualizado");
    for (const ruim of [
      { titulo: "x", paragrafos: [] },
      { titulo: "x", paragrafos: [{ id: "P!", texto: "a", fontes: [] }] },
      { titulo: "x", paragrafos: [{ id: "p1", texto: "a", fontes: ["1"] }] },
      {
        titulo: "x",
        ano: 1700,
        paragrafos: [{ id: "p1", texto: "a", fontes: [] }],
      },
      {
        titulo: "x",
        extra: 1,
        paragrafos: [{ id: "p1", texto: "a", fontes: [] }],
      },
      {
        titulo: "x",
        paragrafos: [{ id: "p1", texto: "a".repeat(6001), fontes: [] }],
      },
    ])
      expect(await salvar(caio, s, a, 1, ruim)).toBe("dados_invalidos");
    await sessao(ana, "Ana", async (tx) => {
      const r = await tx.query(
        `select titulo, ano, texto_rev, texto_origem, texto->'paragrafos'->0->>'texto' as t from public.stories where id = $1`,
        [s],
      );
      expect(r.rows[0]).toEqual({
        titulo: "Título novo",
        ano: 1962,
        texto_rev: 1,
        texto_origem: "cofacilitador",
        t: "novo",
      });
    });
  });

  it("edição longa vira versão a cada 10 min", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await editar(ana, "Ana", s, a);
    expect(await salvar(ana, s, a, 0, "começo")).toBe("ok");
    expect((await versoes(s)).length).toBe(1);
    await db.query(
      `update public.edit_locks set desde = now() - interval '11 minutes' where story_id = $1`,
      [s],
    );
    await db.exec(
      `alter table public.story_versions disable trigger story_versions_imutavel;
       update public.story_versions set criado_em = now() - interval '11 minutes' where story_id = '${s}';
       alter table public.story_versions enable trigger story_versions_imutavel;`,
    );
    expect(await salvar(ana, s, a, 1, "dez minutos")).toBe("ok");
    expect((await versoes(s)).at(-1)?.texto).toBe("dez minutos");
  });

  it("parar de editar guarda a versão e solta a trava", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await editar(ana, "Ana", s, a);
    await salvar(ana, s, a, 0, "saindo");
    await sessao(ana, "Ana", (tx) =>
      tx.query(`select public.parar_de_editar($1, $2)`, [s, a]),
    );
    expect((await versoes(s)).at(-1)?.texto).toBe("saindo");
    expect((await editar(caio, "Caio", s, aba(), false)).nome).toBeNull();
  });
});

describe("restaurar", () => {
  it("guarda o texto atual antes e volta a versão escolhida como versão nova", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await editar(ana, "Ana", s, a);
    await salvar(ana, s, a, 0, "mudei tudo");
    const rev = await sessao(ana, "Ana", async (tx) => {
      const r = await tx.query<{ rev: number }>(
        `select public.restaurar_versao($1, $2, 1) as rev`,
        [s, a],
      );
      return r.rows[0].rev;
    });
    expect(rev).toBe(2);
    expect(await versoes(s)).toEqual([
      { numero: 1, origem: "ia", texto: "Texto da IA.", restaurada_de: null },
      {
        numero: 2,
        origem: "responsavel",
        texto: "mudei tudo",
        restaurada_de: null,
      },
      {
        numero: 3,
        origem: "responsavel",
        texto: "Texto da IA.",
        restaurada_de: 1,
      },
    ]);
    const r = await db.query(
      `select titulo, ano, texto_rev, versao_rev from public.stories where id = $1`,
      [s],
    );
    expect(r.rows[0]).toEqual({
      titulo: "Da IA",
      ano: null,
      texto_rev: 2,
      versao_rev: 2,
    });
  });

  it("sem a trava, não restaura; versão inexistente é recusada", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await editar(ana, "Ana", s, a);
    await sessao(caio, "Caio", async (tx) => {
      expect(
        await tenta(tx, `select public.restaurar_versao($1, $2, 1)`, [
          s,
          aba(),
        ]),
      ).toEqual({ erro: "trava_de_outro" });
    });
    await sessao(ana, "Ana", async (tx) => {
      expect(
        await tenta(tx, `select public.restaurar_versao($1, $2, 9)`, [s, a]),
      ).toEqual({ erro: "dados_invalidos" });
    });
  });

  it("versão continua imutável", async () => {
    const s = await historiaPronta(livroA);
    await expect(
      db.query(
        `update public.story_versions set conteudo = '{}' where story_id = $1`,
        [s],
      ),
    ).rejects.toThrow(/versao_imutavel/);
  });
});

describe("marcar como pronta", () => {
  it("grava quem e quando, guarda o pendente e pode voltar", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await editar(ana, "Ana", s, a);
    await salvar(ana, s, a, 0, "revisado");
    await sessao(caio, "Caio", (tx) =>
      tx.query(`select public.marcar_historia_pronta($1, true)`, [s]),
    );
    expect((await versoes(s)).at(-1)?.texto).toBe("revisado");
    let r = await db.query<{ por: string; em: boolean }>(
      `select revisada_por as por, revisada_em is not null as em from public.stories where id = $1`,
      [s],
    );
    expect(r.rows[0]).toEqual({ por: caio, em: true });
    await sessao(ana, "Ana", (tx) =>
      tx.query(`select public.marcar_historia_pronta($1, false)`, [s]),
    );
    r = await db.query(
      `select revisada_por as por, revisada_em is not null as em from public.stories where id = $1`,
      [s],
    );
    expect(r.rows[0]).toEqual({ por: null, em: false });
  });

  it("história ainda escrevendo não é editável", async () => {
    const r = await db.query<{ id: string }>(
      `insert into public.stories (book_id, estado) values ($1, 'escrevendo') returning id`,
      [livroA],
    );
    await sessao(ana, "Ana", async (tx) => {
      expect(
        await tenta(tx, `select public.marcar_historia_pronta($1, true)`, [
          r.rows[0].id,
        ]),
      ).toEqual({ erro: "livro_fechado" });
      expect(
        await tenta(tx, `select * from public.editar_historia($1, $2)`, [
          r.rows[0].id,
          aba(),
        ]),
      ).toEqual({ erro: "livro_fechado" });
    });
  });
});

describe("fotos da história", () => {
  async function foto(livro: string) {
    const r = await db.query<{ id: string }>(
      `insert into public.photos (book_id, caminho, largura, altura)
       values ($1::uuid, 'livros/' || $1::text || '/acervo/' || gen_random_uuid() || '.jpg', 2000, 1500) returning id`,
      [livro],
    );
    return r.rows[0].id;
  }

  it("até 4 por história; foto de outro livro não entra; tirar não apaga do acervo", async () => {
    const s = await historiaPronta(livroA);
    const fotos: string[] = [];
    for (let i = 0; i < 5; i++) fotos.push(await foto(livroA));
    const deFora = await foto(livroB);
    await sessao(ana, "Ana", async (tx) => {
      expect(
        await tenta(
          tx,
          `insert into public.story_photos (story_id, photo_id, book_id) values ($1, $2, $3)`,
          [s, deFora, livroA],
        ),
      ).toEqual({ erro: expect.stringMatching(/foreign key/) });
      for (let i = 0; i < 4; i++)
        expect(
          await tenta(
            tx,
            `insert into public.story_photos (story_id, photo_id, book_id, ordem) values ($1, $2, $3, $4)`,
            [s, fotos[i], livroA, i + 1],
          ),
        ).toEqual({ linhas: 0, afetadas: 1 });
      expect(
        await tenta(
          tx,
          `insert into public.story_photos (story_id, photo_id, book_id) values ($1, $2, $3)`,
          [s, fotos[4], livroA],
        ),
      ).toEqual({ erro: "cota_fotos_historia" });
      expect(
        await tenta(tx, `delete from public.story_photos where photo_id = $1`, [
          fotos[0],
        ]),
      ).toEqual({ linhas: 0, afetadas: 1 });
    });
    const r = await db.query(`select 1 from public.photos where id = $1`, [
      fotos[0],
    ]);
    expect(r.rows.length).toBe(1);
  });

  it("outro livro não lê nem mexe", async () => {
    const s = await historiaPronta(livroA);
    const f = await foto(livroA);
    await db.query(
      `insert into public.story_photos (story_id, photo_id, book_id) values ($1, $2, $3)`,
      [s, f, livroA],
    );
    await sessao(beto, "Beto", async (tx) => {
      expect(
        await tenta(
          tx,
          `select 1 from public.story_photos where story_id = $1`,
          [s],
        ),
      ).toEqual({ linhas: 0, afetadas: 0 });
      expect(
        await tenta(tx, `delete from public.story_photos where story_id = $1`, [
          s,
        ]),
      ).toEqual({ linhas: 0, afetadas: 0 });
    });
  });
});

describe("autor e plano vencido", () => {
  it("porta_autor não alcança nada do editor", async () => {
    const r = await db.query<{ algum: boolean }>(
      `select has_table_privilege('porta_autor', 'public.story_photos', 'select, insert, update, delete')
           or has_table_privilege('porta_autor', 'public.edit_locks', 'select, insert, update, delete')
           or has_column_privilege('porta_autor', 'public.stories', 'texto', 'select')
           or has_function_privilege('porta_autor', 'public.salvar_historia(uuid, uuid, integer, jsonb, jsonb)', 'execute') as algum`,
    );
    expect(r.rows[0].algum).toBe(false);
  });

  it("plano vencido não edita, mas lê", async () => {
    const outro = await criarUsuario(db, "dora@exemplo.com");
    const livro = await ativarPlano(db, outro, "Lia");
    const s = await historiaPronta(livro);
    await vencerPlano(db, livro);
    await sessao(outro, "Dora", async (tx) => {
      expect(
        await tenta(tx, `select * from public.editar_historia($1, $2)`, [
          s,
          aba(),
        ]),
      ).toEqual({ erro: "livro_fechado" });
      expect(
        await tenta(tx, `select texto, ano from public.stories where id = $1`, [
          s,
        ]),
      ).toEqual({ linhas: 1, afetadas: 0 });
    });
  });
});
