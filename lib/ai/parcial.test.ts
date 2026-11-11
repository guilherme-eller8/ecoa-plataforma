import { describe, expect, it } from "vitest";
import { extrairTextoParcial } from "./parcial";

const completo = JSON.stringify({
  titulo: "A fazenda em Guarapari",
  paragrafos: [
    { texto: 'Meu pai dizia: "trabalho é reza".', fontes: [1, 2] },
    { texto: "Depois a gente\nmudou para Belo Horizonte.", fontes: [3] },
  ],
  lacunas: [{ pergunta: "Em que ano?", motivo: "não diz" }],
});

describe("extrairTextoParcial", () => {
  it("JSON completo: título e parágrafos, sem as lacunas", () => {
    expect(extrairTextoParcial(completo)).toEqual({
      titulo: "A fazenda em Guarapari",
      paragrafos: [
        'Meu pai dizia: "trabalho é reza".',
        "Depois a gente\nmudou para Belo Horizonte.",
      ],
    });
  });

  it("nada chegou ainda", () => {
    expect(extrairTextoParcial("")).toEqual({ titulo: null, paragrafos: [] });
    expect(extrairTextoParcial('{"tit')).toEqual({
      titulo: null,
      paragrafos: [],
    });
  });

  it("cortado em qualquer ponto nunca lança e só cresce", () => {
    let anterior = "";
    for (let i = 0; i <= completo.length; i++) {
      const r = extrairTextoParcial(completo.slice(0, i));
      const atual = [r.titulo ?? "", ...r.paragrafos].join("|");
      expect(atual.length).toBeGreaterThanOrEqual(
        anterior.replace(/\s+$/, "").length - 1,
      );
      anterior = atual;
    }
  });

  it("escape cortado no fim espera o próximo pedaço", () => {
    const corte = '{"titulo":"X","paragrafos":[{"texto":"ele disse \\';
    expect(extrairTextoParcial(corte).paragrafos).toEqual(["ele disse"]);
    const unicode = '{"titulo":"X","paragrafos":[{"texto":"a\\u00e';
    expect(extrairTextoParcial(unicode).paragrafos).toEqual(["a"]);
    const unicodeOk = '{"titulo":"X","paragrafos":[{"texto":"a\\u00e9';
    expect(extrairTextoParcial(unicodeOk).paragrafos).toEqual(["aé"]);
  });

  it("parágrafo pela metade aparece pela metade", () => {
    const meio = completo.slice(0, completo.indexOf("Belo") + 2);
    expect(extrairTextoParcial(meio).paragrafos.at(-1)).toBe(
      "Depois a gente\nmudou para Be",
    );
  });
});
