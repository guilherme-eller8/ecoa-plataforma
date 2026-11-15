import { describe, expect, it } from "vitest";
import { ESPEC_GRAFICA, PAGINAS_INCLUSAS } from "@/lib/config";
import {
  capaAberta,
  completarPaginas,
  larguraTextoMm,
  lombadaMm,
  paginaDoMiolo,
  paginasExtras,
  especUsada,
} from "./espec";
import { caixaDaFoto, dpiDaFoto, fotoPequenaParaImprimir } from "./fotos";
import { resumoDePaginas } from "./alertas";

describe("geometria da gráfica (config.ts)", () => {
  it("completa até o múltiplo de 4 e nunca devolve menos", () => {
    expect([1, 3, 4, 5, 15, 16, 79, 80, 81].map(completarPaginas)).toEqual([
      4, 4, 4, 8, 16, 16, 80, 80, 84,
    ]);
  });

  it("80 páginas: lombada de 9 mm e capa aberta de 357 × 246 mm", () => {
    expect(lombadaMm(80)).toBe(9);
    const c = capaAberta(80);
    expect(c.larguraMm).toBe(357);
    expect(c.alturaMm).toBe(246);
    expect(c.versoX).toBe(15);
    expect(c.frenteX).toBeCloseTo(191, 5);
    // dobra + verso + canal + lombada + canal + frente + dobra = largura
    expect(
      c.dobraMm * 2 + c.papelaoLarguraMm * 2 + 16 + c.lombadaMm,
    ).toBeCloseTo(c.larguraMm, 5);
    // o corte tira as dobras
    expect(c.corte).toEqual({ x: 15, y: 15, larguraMm: 327, alturaMm: 216 });
  });

  it("a lombada cresce com as páginas (0,1 mm por folha, 2 páginas por folha)", () => {
    expect(lombadaMm(84) - lombadaMm(80)).toBeCloseTo(0.2, 5);
    expect(lombadaMm(100)).toBeGreaterThan(lombadaMm(80));
  });

  it("a página do miolo tem 154 × 216 mm com a sangria de 3 mm", () => {
    const p = paginaDoMiolo();
    expect([p.larguraMm, p.alturaMm]).toEqual([154, 216]);
    expect(larguraTextoMm()).toBe(113);
  });

  it("o extra é só informação, nunca um teto (Q16)", () => {
    expect(paginasExtras(72)).toBe(0);
    expect(paginasExtras(92)).toBe(92 - PAGINAS_INCLUSAS);
    expect(resumoDePaginas(92)).toMatchObject({
      titulo: "92 páginas",
      extras: 12,
    });
    expect(resumoDePaginas(92).frase).toMatch(/orçamento da gráfica/);
    expect(resumoDePaginas(72).frase).toMatch(/Cabe no plano/);
  });

  it("a especificação usada leva a versão e o que ainda não foi confirmado", () => {
    const e = especUsada();
    expect(e.versao).toBe(ESPEC_GRAFICA.versao);
    expect(e.confirmada).toBe(false);
    expect(e.miolo.sangriaMm).toBe(3);
  });
});

describe("fotos no papel", () => {
  it("a caixa segue a proporção, sem passar da largura da mancha nem de 85 mm de altura", () => {
    expect(caixaDaFoto({ largura: 2400, altura: 1600 })).toEqual({
      larguraMm: 113,
      alturaMm: 75.3,
    });
    const retrato = caixaDaFoto({ largura: 1200, altura: 1800 });
    expect(retrato.alturaMm).toBe(85);
    expect(retrato.larguraMm).toBeCloseTo(56.7, 1);
    expect(caixaDaFoto({ largura: null, altura: null }).larguraMm).toBe(113); // 4:3
  });

  it("alerta abaixo de 300 DPI no tamanho impresso", () => {
    // 113 mm = 4,45 pol: 1335 px é 300 DPI.
    expect(dpiDaFoto({ largura: 1335, altura: 890 })).toBe(300);
    expect(fotoPequenaParaImprimir({ largura: 1335, altura: 890 })).toBe(false);
    expect(fotoPequenaParaImprimir({ largura: 1000, altura: 667 })).toBe(true);
    expect(fotoPequenaParaImprimir({ largura: null, altura: null })).toBe(
      false,
    );
  });
});
