// Evals, fase 1A (T54): uso por dia, primeira palavra e cotas, somados no banco.
// O que importa: a soma passa de 1.000 linhas sem perder nada, os percentis ignoram a fila
// parada, só a chave secreta executa e nenhuma coluna devolvida é texto livre.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ativarPlano, como, criarBanco, criarUsuario, tenta } from "./banco";

let db: PGlite;
let livroA: string;
let livroB: string;
let anaId: string;
const padrao = new Map<string, string>(); // história de cada livro, para as linhas sem história própria

async function historia(livro: string) {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.stories (book_id) values ($1) returning id`,
    [livro],
  );
  return rows[0].id;
}

/** Uma linha de ai_usage, com o horário dado (UTC). */
async function uso(
  livro: string,
  c: {
    etapa: string;
    ok?: boolean;
    custo?: number;
    min?: number | null;
    historia?: string | null;
    ms?: number | null;
    tentativa?: number;
    em?: string;
  },
) {
  await db.query(
    `insert into public.ai_usage (book_id, story_id, etapa, provedor, modelo, ok, custo_usd,
       minutos_audio, ms_desde_envio, tentativa, erro_codigo, criado_em)
     values ($1, $2, $3, 'anthropic', 'm', $4, $5, $6, $7, $8, $9, coalesce($10::timestamptz, now()))`,
    [
      livro,
      c.historia ?? padrao.get(livro),
      c.etapa,
      c.ok ?? true,
      c.custo ?? 0,
      c.min ?? null,
      c.ms ?? null,
      c.tentativa ?? 1,
      c.ok === false ? "provedor_falhou" : null,
      c.em ?? null,
    ],
  );
}

beforeAll(async () => {
  db = await criarBanco();
  anaId = await criarUsuario(db, "ana@exemplo.com");
  const beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, anaId, "Nelson");
  livroB = await ativarPlano(db, beto, "Zé");
  for (const l of [livroA, livroB]) padrao.set(l, await historia(l));
});
afterAll(async () => {
  await db.close();
});

describe("admin_uso_por_dia", () => {
  it("soma acima de 1.000 linhas, separa falhas e repetições, no dia de Brasília", async () => {
    // 1.200 chamadas de 1 centavo em 10/12 às 15 h de Brasília.
    await db.query(
      `insert into public.ai_usage (book_id, story_id, etapa, provedor, modelo, ok, custo_usd, tentativa, criado_em)
       select $1, $2::uuid, 'editar', 'anthropic', 'm', true, 0.01, case when g % 100 = 0 then 2 else 1 end,
              '2026-12-10 18:00:00+00'
       from generate_series(1, 1200) g`,
      [livroA, padrao.get(livroA)],
    );
    await uso(livroB, {
      etapa: "editar",
      ok: false,
      custo: 0.5,
      em: "2026-12-10 18:00:00+00",
    });
    // 01:30 UTC de 11/12 ainda é 10/12 em Brasília; 03:30 UTC já é 11/12.
    await uso(livroA, {
      etapa: "transcrever",
      custo: 0.02,
      min: 3,
      em: "2026-12-11 01:30:00+00",
    });
    await uso(livroA, {
      etapa: "transcrever",
      custo: 0.02,
      min: 3,
      em: "2026-12-11 03:30:00+00",
    });

    const { rows } = await db.query<{
      dia: string;
      etapa: string;
      chamadas: number;
      falhas: number;
      repetidas: number;
      custo_usd: string;
      custo_falhas_usd: string;
      minutos_audio: string;
    }>(
      `select dia::text, etapa, chamadas::int, falhas::int, repetidas::int, custo_usd::float8::text as custo_usd,
              custo_falhas_usd::float8::text as custo_falhas_usd, minutos_audio::float8::text as minutos_audio
       from public.admin_uso_por_dia('2026-12-10', '2026-12-10') order by etapa`,
    );
    expect(rows).toEqual([
      {
        dia: "2026-12-10",
        etapa: "editar",
        chamadas: 1201,
        falhas: 1,
        repetidas: 12,
        custo_usd: "12.5",
        custo_falhas_usd: "0.5",
        minutos_audio: "0",
      },
      {
        dia: "2026-12-10",
        etapa: "transcrever",
        chamadas: 1,
        falhas: 0,
        repetidas: 0,
        custo_usd: "0.02",
        custo_falhas_usd: "0",
        minutos_audio: "3",
      },
    ]);
  });

  it("recusa período invertido ou longo demais", async () => {
    for (const [de, ate] of [
      ["2026-12-10", "2026-12-01"],
      ["2025-01-01", "2026-12-01"],
    ]) {
      await expect(
        db.query(`select * from public.admin_uso_por_dia($1, $2)`, [de, ate]),
      ).rejects.toThrow("dados_invalidos");
    }
  });
});

describe("admin_primeira_palavra", () => {
  it("separa por faixa da duração da história e tira a fila parada dos percentis", async () => {
    const curtas = await Promise.all([1, 2, 3].map(() => historia(livroA)));
    const longa = await historia(livroA);
    const parada = await historia(livroA);
    for (const [h, min, ms] of [
      [curtas[0], 2, 30_000],
      [curtas[1], 2, 40_000],
      [curtas[2], 2, 50_000],
      [longa, 25, 200_000],
      [parada, 2, 19 * 60_000 + 40 * 60_000], // 59 min: fila parada
    ] as const) {
      await uso(livroA, { etapa: "transcrever", historia: h, min });
      await uso(livroA, { etapa: "editar", historia: h, ms });
    }
    // Falha da etapa editar não conta.
    await uso(livroA, {
      etapa: "editar",
      historia: curtas[0],
      ok: false,
      ms: 1,
    });

    const { rows } = await db.query<{
      faixa: number;
      esperas: number;
      p50_ms: number;
      p95_ms: number;
      paradas: number;
    }>(
      `select faixa, esperas::int, p50_ms, p95_ms, paradas::int
       from public.admin_primeira_palavra(now() - interval '1 hour', array[5, 20], 1800000)
       order by faixa`,
    );
    expect(rows).toEqual([
      { faixa: 0, esperas: 3, p50_ms: 40_000, p95_ms: 49_000, paradas: 1 },
      { faixa: 2, esperas: 1, p50_ms: 200_000, p95_ms: 200_000, paradas: 0 },
    ]);
  });

  it("recusa faixas fora de ordem, vazias ou espera parada sem valor", async () => {
    for (const [faixas, parada] of [
      ["{20,5}", 1800000],
      ["{}", 1800000],
      ["{5,20}", 0],
    ] as const) {
      await expect(
        db.query(
          `select * from public.admin_primeira_palavra(now(), $1::numeric[], $2)`,
          [faixas, parada],
        ),
      ).rejects.toThrow("dados_invalidos");
    }
  });
});

describe("admin_cotas_24h", () => {
  it("devolve só o livro perto do teto de minutos ou de pedidos", async () => {
    const { rows: limites } = await db.query<{ min: number; ped: number }>(
      `select privado.max_minutos_ia_por_dia() as min, privado.max_propostas_dia() as ped`,
    );
    // Livro B: 80% dos minutos do dia em transcrições das últimas 24 h.
    await uso(livroB, { etapa: "transcrever", min: limites[0].min * 0.8 });
    // Livro A: transcrições antigas (fora das 24 h) não contam.
    await uso(livroA, {
      etapa: "transcrever",
      min: limites[0].min,
      em: "2026-01-01 12:00:00+00",
    });
    const { rows } = await db.query<{ book_id: string }>(
      `select book_id from public.admin_cotas_24h(0.8)`,
    );
    expect(rows.map((r) => r.book_id)).toEqual([livroB]);
    await expect(
      db.query(`select * from public.admin_cotas_24h(0)`),
    ).rejects.toThrow("dados_invalidos");
  });
});

describe("só a chave secreta executa", () => {
  const chamadas = [
    `select * from public.admin_uso_por_dia('2026-12-01', '2026-12-10')`,
    `select * from public.admin_primeira_palavra(now(), array[5], 1000)`,
    `select * from public.admin_cotas_24h(0.8)`,
  ];
  it.each(["anon", "authenticated", "porta_autor"] as const)(
    "%s não executa nenhuma",
    async (papel) => {
      await como(
        db,
        papel,
        { sub: anaId, app_metadata: { role: "admin" } },
        async (tx) => {
          for (const sql of chamadas)
            expect((await tenta(tx, sql)).erro).toMatch(/permission denied/);
        },
      );
    },
  );
  it("service_role executa todas", async () => {
    await como(db, "service_role", {}, async (tx) => {
      for (const sql of chamadas)
        expect((await tenta(tx, sql)).erro).toBeUndefined();
    });
  });

  it("nenhuma coluna devolvida é texto livre (só etapa e modelo, nomes fixos)", async () => {
    const { rows } = await db.query<{
      funcao: string;
      tipo: string;
      nome: string;
    }>(
      `select p.proname as funcao, t.typname as tipo, a.nome
       from pg_proc p,
            unnest(p.proallargtypes, p.proargmodes, p.proargnames) with ordinality a(tipo_oid, modo, nome, i)
            join pg_type t on t.oid = a.tipo_oid
       where p.proname in ('admin_uso_por_dia', 'admin_primeira_palavra', 'admin_cotas_24h')
         and a.modo = 't' and t.typname in ('text', 'varchar', 'jsonb', 'json')`,
    );
    expect(rows.map((r) => `${r.funcao}.${r.nome}`).sort()).toEqual([
      "admin_uso_por_dia.etapa",
      "admin_uso_por_dia.modelo",
    ]);
  });
});
