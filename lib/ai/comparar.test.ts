import { describe, expect, it } from "vitest";
import { alinharParagrafos, comparar, escapes, similaridade } from "./comparar";
import { detectorPrimeiraPalavra } from "./claude";

describe("comparar", () => {
  it("mede similaridade por palavras", () => {
    expect(similaridade("Peguei o trem", "peguei o trem")).toBe(1);
    expect(similaridade("abc", "xyz")).toBe(0);
  });

  it("alinha parágrafos com remoção e acréscimo", () => {
    const ia = [
      "Peguei o trem em Cachoeiro.",
      "Fiquei emocionado com tudo aquilo.",
      "Dormi na rodoviária.",
    ];
    const fam = [
      "Peguei o trem de ferro em Cachoeiro.",
      "Dormi na rodoviária, no banco duro.",
      "O Tião era meu primo.",
    ];
    expect(alinharParagrafos(ia, fam).map((p) => [p.ia, p.familia])).toEqual([
      [0, 0],
      [1, null],
      [2, 1],
      [null, 2],
    ]);
  });

  it("conta parágrafos alterados e acha o escape sem Confira", () => {
    const c = comparar(
      ["A frase fiel.", "Fiquei emocionado demais."],
      ["A frase fiel.", "Fiquei contente."],
      [],
    );
    expect(c.paragrafosAlterados).toBe(1);
    expect(c.percentualAlterado).toBe(0.5);
    const cl = {
      mudancas: [
        {
          paragrafo: 1,
          categoria: "invencao_removida" as const,
          tipo: "emocao" as const,
          antes: "",
          depois: "",
          sugestao: "",
        },
      ],
    };
    expect(escapes(c, cl)).toHaveLength(1);
    const comConfira = comparar(
      ["A frase fiel.", "Fiquei emocionado demais."],
      ["A frase fiel.", "Fiquei contente."],
      [
        {
          paragrafo: 2,
          inicio: 7,
          fim: 17,
          trecho: "emocionado",
          tipo: "emocao",
          origem: "checagem",
          motivo: "",
        },
      ],
    );
    expect(escapes(comConfira, cl)).toHaveLength(0);
  });
});

describe("primeira palavra no streaming", () => {
  it("dispara no 1º caractere do campo texto, não antes", () => {
    const d = detectorPrimeiraPalavra("texto");
    expect(d('{"titulo":"O trem","paragrafos":[{"texto":"')).toBe(false);
    expect(d('{"titulo":"O trem","paragrafos":[{"texto":"Pe')).toBe(true);
  });
});
