// Prova, no banco, que uma família não enxerga nem mexe no livro de outra.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ativarPlano,
  como,
  criarBanco,
  criarUsuario,
  reverter,
  tenta,
} from "./banco";

let db: PGlite;
let anaId: string; // responsável do livro A
let beto: string; // responsável do livro B
let estranho: string; // logado, sem livro
let livroA: string;
let livroB: string;

const negado = expect.objectContaining({
  erro: expect.stringMatching(/permission denied/),
});

beforeAll(async () => {
  db = await criarBanco();
  anaId = await criarUsuario(db, "ana@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  estranho = await criarUsuario(db, "estranho@exemplo.com");
  livroA = await ativarPlano(db, anaId, "Jair");
  livroB = await ativarPlano(db, beto, "Maria");
  await db.query(
    `insert into public.author_access (book_id, token_hash) values ($1, repeat('a', 64)), ($2, repeat('b', 64))`,
    [livroA, livroB],
  );
  await db.query(
    `insert into public.events (book_id, ator_tipo, ator_id, acao) values ($1, 'responsavel', $2, 'entrou')`,
    [livroB, beto],
  );
});

afterAll(async () => {
  await db.close();
});

const ana = <T>(fn: Parameters<typeof como<T>>[3]) =>
  como(db, "authenticated", { sub: anaId }, fn);

describe("responsável A diante do livro B", () => {
  it("não lê nada de B", async () => {
    await ana(async (tx) => {
      for (const tabela of ["books", "book_members"]) {
        const coluna = tabela === "books" ? "id" : "book_id";
        expect(
          await tenta(
            tx,
            `select * from public.${tabela} where ${coluna} = $1`,
            [livroB],
          ),
        ).toEqual({
          linhas: 0,
          afetadas: 0,
        });
      }
      expect(
        await tenta(
          tx,
          `select id from public.author_access where book_id = $1`,
          [livroB],
        ),
      ).toEqual({
        linhas: 0,
        afetadas: 0,
      });
    });
  });

  it("lê só o próprio livro", async () => {
    await ana(async (tx) => {
      const livros = await tx.query<{ id: string }>(
        `select id from public.books`,
      );
      expect(livros.rows.map((l) => l.id)).toEqual([livroA]);
      const membros = await tx.query<{ book_id: string }>(
        `select book_id from public.book_members`,
      );
      expect(membros.rows.map((m) => m.book_id)).toEqual([livroA]);
    });
  });

  it("não altera B", async () => {
    await ana(async (tx) => {
      expect(
        await tenta(
          tx,
          `update public.books set autor_nome = 'x' where id = $1`,
          [livroB],
        ),
      ).toEqual({
        linhas: 0,
        afetadas: 0,
      });
      expect(
        await tenta(
          tx,
          `update public.book_members set papel = 'cofacilitador' where book_id = $1`,
          [livroB],
        ),
      ).toEqual(negado);
      expect(
        await tenta(
          tx,
          `update public.author_access set revogado_em = now() where book_id = $1`,
          [livroB],
        ),
      ).toEqual(negado);
    });
  });

  it("não apaga nada de B", async () => {
    await ana(async (tx) => {
      expect(
        await tenta(tx, `delete from public.books where id = $1`, [livroB]),
      ).toEqual(negado);
      expect(
        await tenta(tx, `delete from public.book_members where book_id = $1`, [
          livroB,
        ]),
      ).toEqual(negado);
      expect(
        await tenta(tx, `delete from public.author_access where book_id = $1`, [
          livroB,
        ]),
      ).toEqual(negado);
      expect(
        await tenta(tx, `delete from public.events where book_id = $1`, [
          livroB,
        ]),
      ).toEqual(negado);
    });
    const restantes = await db.query(
      `select 1 from public.books where id = $1`,
      [livroB],
    );
    expect(restantes.rows).toHaveLength(1);
  });

  it("não se coloca como membro de B nem cria livros, links ou eventos", async () => {
    await ana(async (tx) => {
      expect(
        await tenta(
          tx,
          `insert into public.book_members (book_id, user_id, papel) values ($1, $2, 'cofacilitador')`,
          [livroB, anaId],
        ),
      ).toEqual(negado);
      expect(
        await tenta(tx, `insert into public.books (autor_nome) values ('x')`),
      ).toEqual(negado);
      expect(
        await tenta(
          tx,
          `insert into public.author_access (book_id, token_hash) values ($1, repeat('c', 64))`,
          [livroB],
        ),
      ).toEqual(negado);
      expect(
        await tenta(
          tx,
          `insert into public.events (ator_tipo, acao) values ('admin', 'entrou')`,
        ),
      ).toEqual(negado);
    });
  });
});

describe("responsável A no próprio livro", () => {
  it("altera o nome do autor", async () => {
    await ana(async (tx) => {
      expect(
        await tenta(
          tx,
          `update public.books set autor_nome = 'Jair Silva' where id = $1`,
          [livroA],
        ),
      ).toEqual({
        linhas: 0,
        afetadas: 1,
      });
    });
  });

  it("não mexe no plano", async () => {
    await ana(async (tx) => {
      for (const sql of [
        `update public.books set plano_vence_em = now() + interval '99 years' where id = $1`,
        `update public.books set plano_estado = 'ativo' where id = $1`,
        `update public.books set plano_ativado_em = now() where id = $1`,
      ]) {
        expect(await tenta(tx, sql, [livroA])).toEqual(negado);
      }
    });
  });

  it("lê o link do autor sem o hash do token", async () => {
    await ana(async (tx) => {
      expect(
        await tenta(tx, `select id, revogado_em from public.author_access`),
      ).toEqual({ linhas: 1, afetadas: 0 });
      expect(
        await tenta(tx, `select token_hash from public.author_access`),
      ).toEqual(negado);
    });
  });

  it("não lê eventos", async () => {
    await ana(async (tx) => {
      expect(await tenta(tx, `select * from public.events`)).toEqual(negado);
    });
  });

  it("não edita com o plano vencido, mesmo antes do job diário", async () => {
    await db.query(
      `update public.books set plano_ativado_em = now() - interval '2 years', plano_vence_em = now() - interval '1 day' where id = $1`,
      [livroA],
    );
    try {
      await ana(async (tx) => {
        expect(
          await tenta(
            tx,
            `update public.books set autor_nome = 'Outro' where id = $1`,
            [livroA],
          ),
        ).toEqual({
          linhas: 0,
          afetadas: 0,
        });
      });
    } finally {
      await db.query(
        `update public.books set plano_ativado_em = now(), plano_vence_em = now() + interval '12 months' where id = $1`,
        [livroA],
      );
    }
  });
});

describe("quem não é membro", () => {
  for (const [rotulo, claims] of [
    ["logado sem livro", () => ({ sub: estranho })],
    [
      "admin com a própria sessão",
      () => ({ sub: estranho, app_metadata: { role: "admin" } }),
    ],
    [
      "quem se diz admin em user_metadata",
      () => ({ sub: estranho, user_metadata: { role: "admin" } }),
    ],
  ] as const) {
    it(`${rotulo} não lê nenhuma linha`, async () => {
      await como(db, "authenticated", claims(), async (tx) => {
        for (const sql of [
          `select id from public.books`,
          `select id from public.book_members`,
          `select id from public.author_access`,
        ]) {
          expect(await tenta(tx, sql)).toEqual({ linhas: 0, afetadas: 0 });
        }
      });
    });
  }

  it("anon não tem acesso a nenhuma tabela", async () => {
    await como(db, "anon", {}, async (tx) => {
      for (const tabela of [
        "books",
        "book_members",
        "author_access",
        "events",
        "photos",
        "causos",
        "prompts",
        "family_access",
        "polls",
        "poll_items",
        "poll_votes",
      ]) {
        expect(await tenta(tx, `select 1 from public.${tabela}`)).toEqual(
          negado,
        );
      }
    });
  });
});

describe("funções do admin só com a chave secreta", () => {
  const chamadas = [
    `select public.admin_ativar_plano('00000000-0000-0000-0000-000000000000', 'x', 12)`,
    `select public.admin_renovar_plano('00000000-0000-0000-0000-000000000000', 12)`,
    `select public.admin_trocar_responsavel('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')`,
    `select public.admin_usuario_por_email('ana@exemplo.com')`,
    `select * from public.admin_listar_livros()`,
    `select privado.vencer_planos()`,
  ];

  it.each(["anon", "authenticated"] as const)(
    "%s não executa nenhuma",
    async (papel) => {
      await como(
        db,
        papel,
        { sub: anaId, app_metadata: { role: "admin" } },
        async (tx) => {
          for (const sql of chamadas) {
            expect(await tenta(tx, sql)).toEqual(
              expect.objectContaining({
                erro: expect.stringMatching(/permission denied/),
              }),
            );
          }
        },
      );
    },
  );
});

describe("regras genéricas (pegam tabela ou função nova esquecida)", () => {
  it("toda tabela de public tem RLS ligada", async () => {
    const r = await db.query<{ relname: string }>(
      `select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    expect(r.rows).toEqual([]);
  });

  it("anon não tem permissão em nenhuma tabela de public", async () => {
    const r = await db.query(
      `select table_name, privilege_type from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'`,
    );
    expect(r.rows).toEqual([]);
  });

  it("anon executa só as portas dos links da família e do autor", async () => {
    const r = await db.query<{ nome: string }>(
      `select n.nspname || '.' || p.proname as nome from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'privado') and has_function_privilege('anon', p.oid, 'execute')
       order by 1`,
    );
    expect(r.rows.map((f) => f.nome)).toEqual([
      "public.autor_consentir",
      "public.autor_pagina",
      "public.autor_preparar_gravacao",
      "public.familia_enviar_causo",
      "public.familia_pagina",
      "public.familia_votar",
    ]);
  });

  it("authenticated executa só as funções da lista", async () => {
    const r = await db.query<{ nome: string }>(
      `select n.nspname || '.' || p.proname as nome from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'privado') and has_function_privilege('authenticated', p.oid, 'execute')
       order by 1`,
    );
    expect(r.rows.map((f) => f.nome)).toEqual([
      "privado.eh_membro",
      "privado.livro_editavel",
      "public.enquete_abrir",
      "public.enquete_adicionar_item",
      "public.enquete_encerrar",
      "public.enquete_remover_votos",
      "public.enquete_salvar",
    ]);
  });

  it("função nova em privado nasce sem EXECUTE para os usuários", async () => {
    await db.exec(
      `create function privado.funcao_nova() returns int language sql as 'select 1'`,
    );
    const r = await db.query<{ pode: boolean }>(
      `select has_function_privilege('authenticated', 'privado.funcao_nova()', 'execute') as pode`,
    );
    await db.exec(`drop function privado.funcao_nova()`);
    expect(r.rows[0].pode).toBe(false);
  });
});

describe("reversão", () => {
  it("deixa public sem tabelas e pode subir de novo", async () => {
    const outro = await criarBanco();
    await reverter(outro);
    const r = await outro.query(
      `select tablename from pg_tables where schemaname = 'public'`,
    );
    expect(r.rows).toEqual([]);
    await outro.close();
  });
});
