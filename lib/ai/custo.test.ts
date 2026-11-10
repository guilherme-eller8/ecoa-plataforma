import { describe, expect, it } from "vitest";
import {
  COTACAO_USD_BRL,
  PREMISSA_HISTORIAS_POR_LIVRO,
  PREMISSA_MIN_AUDIO_POR_HISTORIA,
  PREMISSA_TROCAS_TAMANHO_POR_HISTORIA,
} from "@/lib/config";
import {
  custoClaudeUSD,
  custoTranscricaoUSD,
  emReais,
  formatarReais,
  projetarLivroUSD,
} from "./custo";

describe("custo", () => {
  it("calcula o Opus com cache", () => {
    const usd = custoClaudeUSD("claude-opus-5-5", {
      entrada: 1_000_000,
      saida: 100_000,
      cacheLido: 1_000_000,
      cacheGravado: 0,
    });
    expect(usd).toBeCloseTo(4 + 2 + 0.2);
  });

  it("recusa modelo ou provedor sem preço", () => {
    expect(() =>
      custoClaudeUSD("modelo-x", {
        entrada: 1,
        saida: 1,
        cacheLido: 0,
        cacheGravado: 0,
      }),
    ).toThrow();
    expect(() => custoTranscricaoUSD("x", 1)).toThrow();
  });

  it("converte para reais e formata", () => {
    expect(emReais(1)).toBe(COTACAO_USD_BRL);
    expect(formatarReais(12.5)).toBe("R$ 12,50");
  });

  it("projeta o livro: troca de tamanho refaz só edição e verificação", () => {
    const min = PREMISSA_HISTORIAS_POR_LIVRO * PREMISSA_MIN_AUDIO_POR_HISTORIA;
    const g = 1 + PREMISSA_TROCAS_TAMANHO_POR_HISTORIA;
    expect(
      projetarLivroUSD({
        transcricao: 1,
        estruturar: 0,
        editar: 0,
        verificar: 0,
      }),
    ).toBe(min);
    expect(
      projetarLivroUSD({
        transcricao: 0,
        estruturar: 0,
        editar: 1,
        verificar: 1,
      }),
    ).toBe(min * 2 * g);
  });
});
