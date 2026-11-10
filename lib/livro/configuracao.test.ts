import { describe, expect, it } from "vitest";
import {
  lerConfiguracao,
  marcar,
  pendentes,
  precisaConfigurar,
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
});
