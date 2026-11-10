import { describe, expect, it } from "vitest";
import type { Palavra } from "./schemas";
import { contarPalavras, segmentar, segmentarTodos } from "./segmentar";

const p = (texto: string, inicio: number, falante = "A"): Palavra => ({
  texto,
  inicio,
  fim: inicio + 0.4,
  falante,
  confianca: 0.9,
});

describe("segmentar", () => {
  it("quebra na troca de falante e qualifica o falante pelo arquivo", () => {
    const s = segmentar("a.ogg", [
      p("Oi", 0, "B"),
      p("pai", 0.5, "B"),
      p("Bom", 1, "A"),
      p("dia", 1.5, "A"),
    ]);
    expect(s.map((x) => x.texto)).toEqual(["Oi pai", "Bom dia"]);
    expect(s.map((x) => x.falante)).toEqual(["a.ogg:B", "a.ogg:A"]);
    expect(s.map((x) => x.id)).toEqual([1, 2]);
  });

  it("quebra em pausa longa e no máximo de palavras", () => {
    const pausa = segmentar("a", [p("um", 0), p("dois", 5)], 1, {
      pausaS: 1.5,
      maxPalavras: 40,
    });
    expect(pausa).toHaveLength(2);
    const longo = segmentar("a", [p("a", 0), p("b", 0.5), p("c", 1)], 1, {
      pausaS: 9,
      maxPalavras: 2,
    });
    expect(longo.map((x) => x.texto)).toEqual(["a b", "c"]);
  });

  it("não deixa espaço antes de pontuação", () => {
    expect(
      segmentar("a", [p("Era", 0), p("cedo", 0.4), p(",", 0.8), p("viu", 1)])[0]
        .texto,
    ).toBe("Era cedo, viu");
  });

  it("numera de forma contínua entre arquivos, em ordem alfabética", () => {
    const s = segmentarTodos([
      { arquivo: "b.ogg", palavras: [p("dois", 0)] },
      { arquivo: "a.ogg", palavras: [p("um", 0), p("outro", 9)] },
    ]);
    expect(s.map((x) => [x.arquivo, x.id])).toEqual([
      ["a.ogg", 1],
      ["a.ogg", 2],
      ["b.ogg", 3],
    ]);
  });

  it("conta palavras ignorando pontuação solta", () => {
    expect(contarPalavras("Eu fui , lá - e voltei.")).toBe(5);
  });
});
