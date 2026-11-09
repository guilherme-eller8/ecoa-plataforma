import { describe, expect, it } from "vitest";
import { medidasReduzidas } from "./comprimir";

describe("medidas da foto comprimida", () => {
  it("reduz o lado maior para 3000 e mantém a proporção", () => {
    expect(medidasReduzidas(4032, 3024)).toEqual({
      largura: 3000,
      altura: 2250,
    });
    expect(medidasReduzidas(3024, 4032)).toEqual({
      largura: 2250,
      altura: 3000,
    });
  });
  it("não aumenta foto pequena", () => {
    expect(medidasReduzidas(1200, 800)).toEqual({ largura: 1200, altura: 800 });
  });
});
