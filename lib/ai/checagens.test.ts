import { describe, expect, it } from "vitest";
import {
  checarParagrafo,
  extrairNumeros,
  lerSecao,
  localizarTrecho,
  normalizar,
  padraoDoItem,
} from "./checagens";

const listas = {
  causa: ["por isso", "porque"],
  emocao: ["emocion*", "saudade*"],
  antiSlop: ["lição valiosa", "/nao era (apenas|so) .{1,40}, era /"],
};

describe("normalizar", () => {
  it("tira acento e caixa sem mudar posições", () => {
    const t = "Ação É Ótima";
    expect(normalizar(t)).toBe("acao e otima");
    expect(normalizar(t)).toHaveLength(t.length);
  });
});

describe("listas em .md", () => {
  it("lê os itens de uma seção", () => {
    const md = "# T\n## causa\n- por isso\n- porque\n## emocao\n- medo\n";
    expect(lerSecao(md, "causa")).toEqual(["por isso", "porque"]);
    expect(lerSecao(md, "emocao")).toEqual(["medo"]);
  });

  it("item com * casa qualquer final, só em palavra inteira", () => {
    const re = padraoDoItem("emocion*");
    expect("fiquei emocionado".match(re)).toBeTruthy();
    expect("pre-emocional".match(padraoDoItem("motion*"))).toBeNull();
  });
});

describe("extrairNumeros", () => {
  it("lê dígitos e números por extenso", () => {
    const valores = (t: string) => extrairNumeros(t).map((n) => n.valor);
    expect(valores("em 1958 eu tinha 18")).toEqual([1958, 18]);
    expect(valores("mil novecentos e cinquenta e oito")).toEqual([1958]);
    expect(valores("tinha dezoito anos")).toEqual([18]);
    expect(valores("comprei um carro")).toEqual([]);
    expect(valores("duas vacas e um cavalo")).toEqual([2]);
  });
});

describe("checarParagrafo", () => {
  it("marca emoção e causa que não estão nas fontes", () => {
    const m = checarParagrafo(
      1,
      "Fiquei emocionado, por isso voltei.",
      "aí eu voltei pra casa",
      listas,
    );
    expect(m.map((x) => [x.tipo, x.trecho])).toEqual([
      ["causa", "por isso"],
      ["emocao", "emocionado"],
    ]);
    expect(m.every((x) => x.origem === "checagem")).toBe(true);
  });

  it("não marca o que o autor disse", () => {
    expect(
      checarParagrafo(
        1,
        "Fiquei emocionado.",
        "eu fiquei muito emocionada naquele dia",
        listas,
      ),
    ).toEqual([]);
  });

  it("marca ano e número ausentes, aceita número por extenso nas fontes", () => {
    const m = checarParagrafo(
      2,
      "Em 1962, com 18 anos, fui embora.",
      "eu tinha dezoito anos quando fui embora",
      listas,
    );
    expect(m.map((x) => [x.tipo, x.trecho])).toEqual([["data", "1962"]]);
  });

  it("marca anti-slop por frase e por regex", () => {
    const t = "Foi uma lição valiosa. Não era apenas um emprego, era a vida.";
    const m = checarParagrafo(1, t, t, listas).filter((x) => x.tipo === "slop");
    expect(m).toHaveLength(2);
    expect(t.slice(m[0].inicio, m[0].fim)).toBe("lição valiosa");
  });
});

describe("localizarTrecho", () => {
  it("acha exato e, se não, ignorando acento e aspas", () => {
    const p = "Meu pai era bravo e não deixava sair.";
    expect(localizarTrecho(p, "era bravo")).toEqual({ inicio: 8, fim: 17 });
    expect(localizarTrecho(p, "“NAO deixava sair.”")).toEqual({
      inicio: 20,
      fim: 36,
    });
    expect(localizarTrecho(p, "inexistente")).toBeNull();
  });
});
