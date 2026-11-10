// Números de negócio conferidos no banco batem com lib/config.ts, e todo código de erro
// que o SQL levanta tem frase na tela.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as config from "@/lib/config";
import { FRASES_DOS_CODIGOS } from "@/lib/erros-banco";
import { criarBanco } from "./banco";

let db: PGlite;
beforeAll(async () => {
  db = await criarBanco();
});
afterAll(async () => {
  await db.close();
});

describe("lib/config.ts x banco", () => {
  it.each([
    ["votos_por_pessoa", config.VOTOS_POR_PESSOA],
    ["votos_por_fase", config.VOTOS_POR_FASE],
    ["max_itens_enquete", config.MAX_ITENS_ENQUETE],
    ["max_votantes_por_enquete", config.MAX_VOTANTES_POR_ENQUETE],
    ["max_trocas_voto_por_hora", config.MAX_TROCAS_VOTO_POR_HORA],
    ["max_causos_por_hora", config.MAX_CAUSOS_POR_HORA],
    ["max_causos_por_dia", config.MAX_CAUSOS_POR_DIA],
    ["max_fotos_por_livro", config.MAX_FOTOS_POR_LIVRO],
    ["max_audio_bytes", config.MAX_AUDIO_MB * 1024 * 1024],
    ["max_gravacao_s", config.MAX_GRAVACAO_MIN * 60],
    ["max_gravacoes_autor_por_dia", config.MAX_GRAVACOES_AUTOR_DIA],
    ["max_bytes_autor_por_dia", config.MAX_MB_AUTOR_DIA * 1024 * 1024],
  ])("privado.%s() = %i", async (funcao, valor) => {
    const r = await db.query<{ v: number }>(`select privado.${funcao}() as v`);
    expect(Number(r.rows[0].v)).toBe(valor);
  });
});

describe("códigos de erro do SQL", () => {
  it("todo raise exception '<codigo>' tem frase em lib/erros-banco.ts", () => {
    const pasta = path.resolve(__dirname, "../migrations");
    const sql = readdirSync(pasta)
      .map((f) => readFileSync(path.join(pasta, f), "utf8"))
      .join("\n");
    const codigos = new Set(
      [...sql.matchAll(/raise exception '([a-z_]+)'/g)].map((m) => m[1]),
    );
    const semFrase = [...codigos].filter((c) => !(c in FRASES_DOS_CODIGOS));
    expect(semFrase).toEqual([]);
    expect(codigos.size).toBeGreaterThan(10);
  });
});
