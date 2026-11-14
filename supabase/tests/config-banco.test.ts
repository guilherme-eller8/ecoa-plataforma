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
    ["max_historia_s", config.MAX_HISTORIA_MIN * 60],
    ["max_minutos_ia_por_dia", config.MAX_MINUTOS_IA_DIA],
    ["max_nomes_glossario", config.MAX_NOMES_GLOSSARIO],
    ["max_nomes_por_historia", config.MAX_NOMES_POR_HISTORIA],
    ["consentimento_ia_versao", config.CONSENTIMENTO_IA_VERSAO],
    ["max_historias_divisao", config.MAX_HISTORIAS_DIVISAO],
    ["espera_lote_h", config.ESPERA_LOTE_H],
    ["max_min_conteiner", config.MAX_MIN_CONTEINER],
    ["min_fala_historia_s", config.MIN_FALA_HISTORIA_S],
    ["max_historias_dia", config.MAX_HISTORIAS_DIA],
    ["max_arquivo_s", config.MAX_ARQUIVO_MIN * 60],
    ["max_fala_historia_s", config.MAX_HISTORIA_ESCRITA_MIN * 60],
    ["trava_edicao_s", config.TRAVA_EDICAO_MIN * 60],
    ["versao_a_cada_s", config.VERSAO_A_CADA_MIN * 60],
    ["max_fotos_historia", config.MAX_FOTOS_HISTORIA],
    ["max_paragrafos", config.MAX_PARAGRAFOS],
    ["max_letras_paragrafo", config.MAX_LETRAS_PARAGRAFO],
    ["max_propostas_dia", config.MAX_PROPOSTAS_DIA],
    ["max_audio_extra_s", config.MAX_AUDIO_EXTRA_MIN * 60],
    ["max_audios_historia", config.MAX_AUDIOS_HISTORIA],
    ["instrucao_max", config.INSTRUCAO_MAX],
    ["qr_erros_por_chave", config.QR_ERROS_POR_CHAVE],
    ["qr_erros_global", config.QR_ERROS_GLOBAL],
    ["qr_acertos_por_minuto", config.QR_ACERTOS_POR_MINUTO],
    ["qr_folga_recorte_s", config.QR_FOLGA_RECORTE_S],
    ["qr_audio_espera_s", config.QR_AUDIO_ESPERA_MIN * 60],
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
