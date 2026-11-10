import { describe, expect, it } from "vitest";
import { formatarCelular, normalizarCelular } from "./telefone";

describe("celular do autor", () => {
  it.each([
    ["(31) 99999-8888", "+5531999998888"],
    ["31 3333-4444", "+553133334444"],
    ["5531999998888", "+5531999998888"],
    ["+55 31 99999-8888", "+5531999998888"],
    ["+351 912 345 678", "+351912345678"],
  ])("%s → %s", (entrada, saida) => {
    expect(normalizarCelular(entrada)).toBe(saida);
  });

  it("vazio é null; curto ou longo demais é inválido", () => {
    expect(normalizarCelular("  ")).toBeNull();
    expect(normalizarCelular("9999-8888")).toBeUndefined();
    expect(normalizarCelular("123456789012345678")).toBeUndefined();
  });

  it("formata para leitura", () => {
    expect(formatarCelular("+5531999998888")).toBe("(31) 99999-8888");
    expect(formatarCelular("+553133334444")).toBe("(31) 3333-4444");
    expect(formatarCelular(null)).toBe("");
  });
});
