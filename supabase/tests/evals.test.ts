// Evals, fase 0 (T54): colunas novas de ai_usage e a soma de custo por livro no banco.
// O que importa: nenhum texto da fala cabe em `detalhes`, o código do erro só vale na falha,
// a soma não depende do teto de 1.000 linhas da API, e só a chave secreta lê.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ativarPlano, como, criarBanco, criarUsuario, tenta } from "./banco";

let db: PGlite;
let livroA: string;
let livroB: string;
let gravA: string;

async function gravacao(livro: string) {
  const id = crypto.randomUUID();
  await db.query(
    `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes,
       duracao_s, upload, recebido_em)
     values ($1, $2, 'upload', 'a.m4a', $3, 'audio/mp4', 100, 60, 'recebido', now())`,
    [id, livro, `livros/${livro}/audios/${id}.m4a`],
  );
  return id;
}

const inserir = (campos: string, valores: string) =>
  db
    .query(
      `insert into public.ai_usage (book_id, recording_id, etapa, provedor, modelo, ok, custo_usd${campos})
       values ($1, $2, 'transcrever', 'elevenlabs', 'scribe_v1'${valores})`,
      [livroA, gravA],
    )
    .then(
      () => null,
      (e: Error) => e.message,
    );

beforeAll(async () => {
  db = await criarBanco();
  const ana = await criarUsuario(db, "ana@exemplo.com");
  const beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Nelson");
  livroB = await ativarPlano(db, beto, "Zé");
  gravA = await gravacao(livroA);
});
afterAll(async () => {
  await db.close();
});

describe("ai_usage: colunas de evals", () => {
  it("aceita contagens numéricas, código na falha e a espera do envio", async () => {
    expect(
      await inserir(
        ", minutos_audio, detalhes",
        `, true, 0.02, 1.5, '{"palavras":291,"duvidosas":2,"confianca_pct":97.6}'`,
      ),
    ).toBeNull();
    expect(
      await inserir(", erro_codigo", `, false, 0, 'scribe_falhou'`),
    ).toBeNull();
    expect(await inserir(", ms_desde_envio", `, true, 0.01, 38000`)).toBeNull();
  });

  it("recusa texto em detalhes, em qualquer forma", async () => {
    // Lista só de números passa (o jsonpath em modo lax desembrulha listas): não carrega fala.
    expect(
      await inserir(", detalhes", `, true, 0.01, '{"lista":[1,2]}'`),
    ).toBeNull();
    for (const detalhes of [
      `'{"trecho":"meu pai tinha uma venda"}'`,
      `'{"lista":["meu pai"]}'`,
      `'{"a":[[1,"x"]]}'`,
      `'{"a":{"b":1}}'`,
      `'{"a":true}'`,
      `'{"a":null}'`,
      `'[1,2]'`,
      `'"texto"'`,
    ])
      expect(
        await inserir(", detalhes", `, true, 0.01, ${detalhes}`),
        detalhes,
      ).toMatch(/ai_usage_detalhes_check/);
  });

  it("código do erro só na falha, e só no formato fixo", async () => {
    expect(
      await inserir(", erro_codigo", `, true, 0.01, 'json_invalido'`),
    ).toMatch(/ai_usage_erro_so_na_falha/);
    expect(
      await inserir(", erro_codigo", `, false, 0.01, 'Meu pai disse'`),
    ).toMatch(/ai_usage_erro_codigo_check/);
    expect(await inserir(", ms_desde_envio", `, true, 0.01, -1`)).toMatch(
      /ai_usage_ms_desde_envio_check/,
    );
  });
});

describe("admin_custos_por_livro", () => {
  it("soma tudo no banco, mesmo acima de 1.000 linhas", async () => {
    const gravB = await gravacao(livroB);
    await db.query(
      `insert into public.ai_usage (book_id, recording_id, etapa, provedor, modelo, ok, custo_usd, minutos_audio)
       select $1, $2, case when i % 2 = 0 then 'transcrever' else 'editar' end, 'anthropic', 'm',
              i % 10 <> 0, 0.001, case when i % 2 = 0 then 0.5 end
       from generate_series(1, 1500) i`,
      [livroB, gravB],
    );
    const r = await como(db, "service_role", {}, (tx) =>
      tx.query<{
        custo_usd: string;
        minutos_audio: string;
        chamadas: string;
        falhas: string;
      }>(`select * from public.admin_custos_por_livro() where book_id = $1`, [
        livroB,
      ]),
    );
    expect(r.rows).toHaveLength(1);
    expect(Number(r.rows[0].chamadas)).toBe(1500);
    expect(Number(r.rows[0].falhas)).toBe(150);
    expect(Number(r.rows[0].custo_usd)).toBeCloseTo(1.5, 6);
    expect(Number(r.rows[0].minutos_audio)).toBe(375); // só a transcrição conta minutos
  });

  it.each(["anon", "authenticated", "porta_autor"] as const)(
    "%s não executa nem lê ai_usage",
    async (papel) => {
      await como(db, papel, { app_metadata: { role: "admin" } }, async (tx) => {
        expect(
          await tenta(tx, `select * from public.admin_custos_por_livro()`),
        ).toEqual(
          expect.objectContaining({
            erro: expect.stringMatching(/permission denied/),
          }),
        );
        expect(
          await tenta(tx, `select erro_codigo, detalhes from public.ai_usage`),
        ).toEqual(
          expect.objectContaining({
            erro: expect.stringMatching(/permission denied/),
          }),
        );
      });
    },
  );
});
