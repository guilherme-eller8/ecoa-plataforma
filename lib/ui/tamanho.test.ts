import { describe, expect, it } from "vitest";
import { TAMANHOS, avisoTravados, rotuloDoTamanho } from "./tamanho";

describe("controle de tamanho", () => {
  it("tem 5 posições, de Resumido a Detalhado", () => {
    expect(TAMANHOS).toHaveLength(5);
    expect(rotuloDoTamanho(1)).toBe("Resumido");
    expect(rotuloDoTamanho(5)).toBe("Detalhado");
  });
  it("prende valores fora da escala", () => {
    expect(rotuloDoTamanho(0)).toBe("Resumido");
    expect(rotuloDoTamanho(9)).toBe("Detalhado");
  });
  it("avisa sobre parágrafos travados, no singular e no plural", () => {
    expect(avisoTravados(0)).toBeNull();
    expect(avisoTravados(1)).toBe("1 parágrafo editado à mão fica como está");
    expect(avisoTravados(2)).toBe(
      "2 parágrafos editados à mão ficam como estão",
    );
  });
});
