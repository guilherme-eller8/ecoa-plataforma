import { describe, expect, it } from "vitest";
import {
  lerConfiguracao,
  marcar,
  pendentes,
  precisaConfigurar,
  passosDoPapel,
  proximoPasso,
} from "./configuracao";

describe("configuração inicial", () => {
  it("lê só os passos e estados conhecidos", () => {
    expect(
      lerConfiguracao({ quem: "feito", fotos: "xx", outro: "feito" }),
    ).toEqual({ quem: "feito" });
    expect(lerConfiguracao(null)).toEqual({});
    expect(lerConfiguracao([1])).toEqual({});
  });

  it("leva ao passo 1 só na primeira entrada e com o plano ativo", () => {
    expect(precisaConfigurar({}, true)).toBe(true);
    expect(precisaConfigurar({}, false)).toBe(false);
    expect(precisaConfigurar({ quem: "feito" }, true)).toBe(false);
  });

  it("pendentes: os 'depois' e os sem estado", () => {
    expect(pendentes({ quem: "feito" })).toEqual(["perguntas", "fotos"]);
    expect(
      pendentes({ quem: "feito", perguntas: "pulado", fotos: "depois" }),
    ).toEqual(["fotos"]);
    expect(
      pendentes({ quem: "feito", perguntas: "feito", fotos: "pulado" }),
    ).toEqual([]);
  });

  it("anda pelos passos e marca", () => {
    expect(proximoPasso("quem")).toBe("perguntas");
    expect(proximoPasso("fotos")).toBeNull();
    expect(marcar({}, "quem", "pulado")).toEqual({ quem: "pulado" });
  });

  it("passo Quem mais ajuda: só o responsável, só em livro novo", () => {
    expect(passosDoPapel("responsavel", {})).toEqual([
      "quem",
      "perguntas",
      "fotos",
      "ajuda",
    ]);
    expect(passosDoPapel("cofacilitador", {})).toHaveLength(3);
    // Livro que já passou pela configuração antes do prompt 11 não ganha o passo.
    const antigo = {
      quem: "feito",
      perguntas: "feito",
      fotos: "pulado",
    } as const;
    expect(passosDoPapel("responsavel", antigo)).toHaveLength(3);
    expect(
      passosDoPapel("responsavel", { ...antigo, ajuda: "depois" }),
    ).toHaveLength(4);
    expect(proximoPasso("fotos", passosDoPapel("responsavel", {}))).toBe(
      "ajuda",
    );
    expect(proximoPasso("ajuda", passosDoPapel("responsavel", {}))).toBeNull();
    expect(lerConfiguracao({ ajuda: "pulado" })).toEqual({ ajuda: "pulado" });
  });

  it("pendentes: ajuda só quando ficou para depois, e só para o responsável", () => {
    const cfg = {
      quem: "feito",
      perguntas: "feito",
      fotos: "feito",
      ajuda: "depois",
    } as const;
    expect(pendentes(cfg)).toEqual(["ajuda"]);
    expect(pendentes(cfg, "cofacilitador")).toEqual([]);
    expect(pendentes({ ...cfg, ajuda: undefined })).toEqual([]);
  });
});
