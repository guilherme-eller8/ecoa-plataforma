// Isolamento entre livros nas tabelas do prompt 4 (fotos, perguntas, causos, enquete, link),
// regras de escrita da sessão e o plano vencido.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  abrirEnquete,
  ativarPlano,
  como,
  criarBanco,
  criarLinkFamilia,
  criarUsuario,
  tenta,
  vencerPlano,
} from "./banco";

let db: PGlite;
let ana: string;
let beto: string;
let livroA: string;
let livroB: string;
let fotoB: string;
let causoA: string;
let causoB: string;
let enqueteB: { enquete: string; itens: string[] };

const uuid = () => crypto.randomUUID();
const caminhoFoto = (livro: string) => `livros/${livro}/acervo/${uuid()}.jpg`;
const negado = expect.objectContaining({
  erro: expect.stringMatching(/permission denied|row-level security/),
});
const nada = { linhas: 0, afetadas: 0 };

const comoAna = <T>(fn: Parameters<typeof como<T>>[3]) =>
  como(db, "authenticated", { sub: ana }, fn);
const comoBeto = <T>(fn: Parameters<typeof como<T>>[3]) =>
  como(db, "authenticated", { sub: beto }, fn);

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Jair");
  livroB = await ativarPlano(db, beto, "Maria");
  await criarLinkFamilia(db, livroB, beto, "v1_BBBBBBBBBBBBBBBBBBBBBB");
  fotoB = (
    await db.query<{ id: string }>(
      `insert into public.photos (book_id, caminho) values ($1, $2) returning id`,
      [livroB, caminhoFoto(livroB)],
    )
  ).rows[0].id;
  const causo = async (livro: string) =>
    (
      await db.query<{ id: string }>(
        `insert into public.causos (book_id, nome, texto, consentimento_em, consentimento_versao) values ($1, 'Ana', 'Conta da roça', now(), 1) returning id`,
        [livro],
      )
    ).rows[0].id;
  causoA = await causo(livroA);
  causoB = await causo(livroB);
  await db.query(
    `insert into public.prompts (book_id, texto, origem) values ($1, 'Pergunta de B', 'propria')`,
    [livroB],
  );
  enqueteB = await abrirEnquete(db, livroB, beto, [
    { texto: "Item de B um" },
    { texto: "Item de B dois" },
  ]);
  await db.query(
    `insert into public.poll_votes (book_id, poll_id, poll_item_id, votante, aparelho_hash, nome) values ($1, $2, $3, gen_random_uuid(), repeat('a', 64), 'Ana')`,
    [livroB, enqueteB.enquete, enqueteB.itens[0]],
  );
});

afterAll(async () => {
  await db.close();
});

describe("responsável A diante do livro B", () => {
  it.each(["photos", "causos", "prompts", "polls", "poll_items", "poll_votes"])(
    "não lê %s de B",
    async (t) => {
      const r = await comoAna((tx) =>
        tenta(tx, `select id from public.${t} where book_id = $1`, [livroB]),
      );
      expect(r).toEqual(nada);
    },
  );

  it("não lê o link da família de B", async () => {
    const r = await comoAna((tx) =>
      tenta(tx, `select id from public.family_access where book_id = $1`, [
        livroB,
      ]),
    );
    expect(r).toEqual(nada);
  });

  it("não altera nem apaga nada de B", async () => {
    await comoAna(async (tx) => {
      expect(
        await tenta(
          tx,
          `update public.photos set legenda = 'x' where book_id = $1`,
          [livroB],
        ),
      ).toEqual(nada);
      expect(
        await tenta(
          tx,
          `update public.causos set estado = 'arquivado' where book_id = $1`,
          [livroB],
        ),
      ).toEqual(nada);
      expect(
        await tenta(tx, `delete from public.prompts where book_id = $1`, [
          livroB,
        ]),
      ).toEqual(nada);
    });
  });

  it("não cria pergunta nem foto em B", async () => {
    await comoAna(async (tx) => {
      expect(
        await tenta(
          tx,
          `insert into public.prompts (book_id, texto, origem) values ($1, 'Intrusa', 'propria')`,
          [livroB],
        ),
      ).toEqual(negado);
      expect(
        await tenta(
          tx,
          `insert into public.photos (book_id, caminho) values ($1, $2)`,
          [livroB, caminhoFoto(livroB)],
        ),
      ).toEqual(negado);
    });
  });

  it("não aponta pergunta de A para foto ou causo de B (FK por livro)", async () => {
    await comoAna(async (tx) => {
      const foto = await tenta(
        tx,
        `insert into public.prompts (book_id, texto, origem, photo_id) values ($1, 'Com foto', 'propria', $2)`,
        [livroA, fotoB],
      );
      expect(foto.erro).toMatch(/foreign key/);
      const causo = await tenta(
        tx,
        `insert into public.prompts (book_id, texto, origem, causo_id) values ($1, 'Do causo', 'causo', $2)`,
        [livroA, causoB],
      );
      expect(causo.erro).toMatch(/foreign key/);
    });
  });

  it("não mexe na enquete de B pelas funções", async () => {
    await comoAna(async (tx) => {
      for (const [sql, params] of [
        [`select public.enquete_encerrar($1)`, [enqueteB.enquete]],
        [
          `select public.enquete_salvar($1, $2::uuid[])`,
          [enqueteB.enquete, enqueteB.itens],
        ],
        [
          `select public.enquete_remover_votos($1, gen_random_uuid())`,
          [enqueteB.enquete],
        ],
        [
          `select public.enquete_adicionar_item($1, '{"texto":"Intrusa"}'::jsonb)`,
          [enqueteB.enquete],
        ],
        [
          `select public.enquete_abrir($1, '[{"texto":"aaa"},{"texto":"bbb"}]'::jsonb)`,
          [livroB],
        ],
      ] as const) {
        expect(await tenta(tx, sql, [...params])).toEqual({
          erro: "sem_permissao",
        });
      }
    });
  });
});

describe("responsável A no próprio livro", () => {
  it("cria foto e muda a legenda pela sessão (o CHECK não depende de função)", async () => {
    await comoAna(async (tx) => {
      expect(
        await tenta(
          tx,
          `insert into public.photos (book_id, caminho, largura, altura) values ($1, $2, 3000, 2000)`,
          [livroA, caminhoFoto(livroA)],
        ),
      ).toEqual({ linhas: 0, afetadas: 1 });
      expect(
        await tenta(
          tx,
          `update public.photos set legenda = 'Na praia' where book_id = $1`,
          [livroA],
        ),
      ).toEqual({ linhas: 0, afetadas: 1 });
    });
  });

  it("caminho de foto fora da regex é recusado", async () => {
    await comoAna(async (tx) => {
      for (const caminho of [
        `livros/${livroB}/acervo/${uuid()}.jpg`,
        `livros/${livroA}/acervo/%2e%2e/${uuid()}.jpg`,
        `livros/${livroA}/acervo/${uuid()}.png`,
      ]) {
        const r = await tenta(
          tx,
          `insert into public.photos (book_id, caminho) values ($1, $2)`,
          [livroA, caminho],
        );
        expect(r.erro).toMatch(/photos_caminho_do_livro/);
      }
    });
  });

  it("transições da pergunta: as da tela passam; respondida não; enviada_em é do banco", async () => {
    await comoAna(async (tx) => {
      const p = await tx.query<{ id: string }>(
        `insert into public.prompts (book_id, texto, origem) values ($1, 'Como era a casa?', 'propria') returning id`,
        [livroA],
      );
      const id = p.rows[0].id;
      await tx.query(
        `update public.prompts set estado = 'enviada' where id = $1`,
        [id],
      );
      const enviada = await tx.query<{ tem: boolean }>(
        `select enviada_em is not null as tem from public.prompts where id = $1`,
        [id],
      );
      expect(enviada.rows[0].tem).toBe(true);
      expect(
        await tenta(
          tx,
          `update public.prompts set estado = 'respondida' where id = $1`,
          [id],
        ),
      ).toEqual({ erro: "transicao_invalida" });
      expect(
        await tenta(
          tx,
          `update public.prompts set enviada_em = now() where id = $1`,
          [id],
        ),
      ).toEqual(negado);
      expect(
        await tenta(tx, `delete from public.prompts where id = $1`, [id]),
      ).toEqual(nada);
      await tx.query(
        `update public.prompts set estado = 'para_enviar' where id = $1`,
        [id],
      );
      expect(
        await tenta(tx, `delete from public.prompts where id = $1`, [id]),
      ).toEqual({
        linhas: 0,
        afetadas: 1,
      });
    });
  });

  it("o servidor pode marcar respondida direto de para_enviar (gravação ao vivo, prompt 5)", async () => {
    const p = await db.query<{ id: string }>(
      `insert into public.prompts (book_id, texto, origem) values ($1, 'Na mesa de jantar', 'propria') returning id`,
      [livroA],
    );
    const r = await como(db, "service_role", {}, (tx) =>
      tenta(
        tx,
        `update public.prompts set estado = 'respondida' where id = $1`,
        [p.rows[0].id],
      ),
    );
    expect(r).toEqual({ linhas: 0, afetadas: 1 });
  });

  it("causo: só o estado muda; o que a família mandou nunca", async () => {
    await comoAna(async (tx) => {
      expect(
        await tenta(
          tx,
          `update public.causos set estado = 'virou_pergunta' where id = $1`,
          [causoA],
        ),
      ).toEqual({ linhas: 0, afetadas: 1 });
      expect(
        await tenta(
          tx,
          `update public.causos set texto = 'outro' where id = $1`,
          [causoA],
        ),
      ).toEqual(negado);
    });
  });

  it("virar pergunta: pergunta ligada ao causo", async () => {
    await comoAna(async (tx) => {
      expect(
        await tenta(
          tx,
          `insert into public.prompts (book_id, tipo, texto, origem, causo_id) values ($1, 'causo', 'Conte a história que a Ana pediu', 'causo', $2)`,
          [livroA, causoA],
        ),
      ).toEqual({ linhas: 0, afetadas: 1 });
    });
  });

  it("enquete: abrir, adicionar, salvar sem duplicar e remover votos", async () => {
    const { createHash } = await import("node:crypto");
    await db.query(
      `insert into public.prompts (book_id, texto, origem, banco_id) values ($1, 'Do banco', 'banco', 'raizes-01')`,
      [livroA],
    );
    const { enquete, itens } = await abrirEnquete(db, livroA, ana, [
      { texto: "Do banco", banco_id: "raizes-01" },
      { texto: "Própria" },
      { texto: "Do causo", causo_id: causoA },
    ]);
    await comoAna(async (tx) => {
      expect(
        await tenta(tx, `select public.enquete_abrir($1, null)`, [livroA]),
      ).toEqual({ erro: "dados_invalidos" });
      expect(
        await tenta(tx, `select public.enquete_abrir($1, $2::jsonb)`, [
          livroA,
          JSON.stringify([
            { texto: "aaa" },
            { texto: "bbb", causo_id: causoB },
          ]),
        ]),
      ).toEqual({ erro: "item_invalido" });
      expect(
        await tenta(tx, `select public.enquete_adicionar_item($1, $2::jsonb)`, [
          enquete,
          JSON.stringify({ texto: "x".repeat(501) }),
        ]),
      ).toEqual({ erro: "item_invalido" });
      expect(
        await tenta(tx, `insert into public.polls (book_id) values ($1)`, [
          livroA,
        ]),
      ).toEqual(negado);
    });
    await db.query(
      `insert into public.poll_votes (book_id, poll_id, poll_item_id, votante, aparelho_hash, nome) values ($1, $2, $3, $4, $5, 'Ana'), ($1, $2, $6, $4, $5, 'Ana')`,
      [
        livroA,
        enquete,
        itens[0],
        uuid(),
        createHash("sha256").update("x").digest("hex"),
        itens[1],
      ],
    );
    await comoAna(async (tx) => {
      const salvar = () =>
        tx.query<{ n: number }>(
          `select public.enquete_salvar($1, $2::uuid[]) as n`,
          [enquete, itens],
        );
      expect((await salvar()).rows[0].n).toBe(3);
      expect((await salvar()).rows[0].n).toBe(0);
      const doBanco = await tx.query<{ n: number }>(
        `select count(*)::int as n from public.prompts where book_id = $1 and banco_id = 'raizes-01'`,
        [livroA],
      );
      expect(doBanco.rows[0].n).toBe(1);
      const causo = await tx.query<{ estado: string }>(
        `select estado from public.causos where id = $1`,
        [causoA],
      );
      expect(causo.rows[0].estado).toBe("virou_pergunta");
      const votante = await tx.query<{ votante: string }>(
        `select votante from public.poll_votes where poll_id = $1 limit 1`,
        [enquete],
      );
      const r = await tx.query<{ n: number }>(
        `select public.enquete_remover_votos($1, $2) as n`,
        [enquete, votante.rows[0].votante],
      );
      expect(r.rows[0].n).toBe(2);
      expect(
        await tenta(tx, `select aparelho_hash from public.poll_votes`),
      ).toEqual(negado);
      expect(await tenta(tx, `select trocas from public.polls`)).toEqual(
        negado,
      );
      expect(
        await tenta(tx, `select token_hash from public.family_access`),
      ).toEqual(negado);
    });
  });

  it("201ª foto: cota_fotos", async () => {
    const dono = await criarUsuario(db, "cota@exemplo.com");
    const livro = await ativarPlano(db, dono, "Bia");
    await db.query(
      `insert into public.photos (book_id, caminho) select $1::uuid, 'livros/' || $1::text || '/acervo/' || gen_random_uuid() || '.jpg' from generate_series(1, 200)`,
      [livro],
    );
    const r = await como(db, "authenticated", { sub: dono }, (tx) =>
      tenta(
        tx,
        `insert into public.photos (book_id, caminho) values ($1, $2)`,
        [livro, caminhoFoto(livro)],
      ),
    );
    expect(r).toEqual({ erro: "cota_fotos" });
  });
});

describe("plano vencido", () => {
  it("UPDATE e DELETE afetam 0 linhas, INSERT dá erro e as funções dizem livro_fechado", async () => {
    const dono = await criarUsuario(db, "vencido@exemplo.com");
    const livro = await ativarPlano(db, dono, "Rui");
    const { enquete } = await abrirEnquete(db, livro, dono, [
      { texto: "Um item" },
      { texto: "Outro item" },
    ]);
    await db.query(
      `insert into public.prompts (book_id, texto, origem) values ($1, 'Antiga', 'propria')`,
      [livro],
    );
    await vencerPlano(db, livro);
    await como(db, "authenticated", { sub: dono }, async (tx) => {
      expect(
        await tenta(
          tx,
          `update public.prompts set texto = 'Nova' where book_id = $1`,
          [livro],
        ),
      ).toEqual(nada);
      expect(
        await tenta(tx, `delete from public.prompts where book_id = $1`, [
          livro,
        ]),
      ).toEqual(nada);
      expect(
        await tenta(
          tx,
          `insert into public.prompts (book_id, texto, origem) values ($1, 'Nova', 'propria')`,
          [livro],
        ),
      ).toEqual(negado);
      expect(
        await tenta(tx, `select public.enquete_encerrar($1)`, [enquete]),
      ).toEqual({
        erro: "livro_fechado",
      });
    });
  });
});

describe("membro de B só vê o que é de B", () => {
  it("Beto lê os próprios dados", async () => {
    const r = await comoBeto((tx) =>
      tenta(tx, `select id from public.prompts where book_id = $1`, [livroB]),
    );
    expect(r).toEqual({ linhas: 1, afetadas: 0 });
  });
});
