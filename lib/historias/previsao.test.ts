import { describe, expect, it } from "vitest";
import { andamento, tempoPrevisto } from "./previsao";

describe("andamento previsto", () => {
  it("5 min de áudio fica pronto em cerca de 3 min", () => {
    const p = tempoPrevisto(300);
    expect(p.total).toBeGreaterThan(120);
    expect(p.total).toBeLessThan(200);
  });

  it("nunca passa de 95% nem volta para trás ao mudar de etapa", () => {
    const ouvindo = andamento("ouvindo", 300, 30);
    const escrevendo = andamento("escrevendo", 300, 30);
    expect(escrevendo.fracao).toBeGreaterThanOrEqual(ouvindo.fracao);
    expect(andamento("escrevendo", 300, 10_000).fracao).toBe(0.95);
  });

  it("ouvindo demorado não invade a fatia de escrever", () => {
    const p = tempoPrevisto(300);
    expect(andamento("ouvindo", 300, 999).fracao).toBeLessThan(
      p.ouvir / p.total,
    );
  });

  it("frase curta, sem tempo negativo", () => {
    expect(andamento("ouvindo", 300, 0).frase).toMatch(
      /^Ouvindo o áudio · falta cerca de \d min$/,
    );
    expect(andamento("escrevendo", 300, 10_000).frase).toBe(
      "Escrevendo o texto · quase pronta",
    );
  });
});
