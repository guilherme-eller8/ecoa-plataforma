import { describe, expect, it } from "vitest";
import {
  ETAPAS,
  emProcessamento,
  etapaConcluida,
  rotuloDaEtapa,
} from "./etapas";

describe("etapas do cartão de história", () => {
  it("seguem a ordem do PRD", () => {
    expect(ETAPAS.map((e) => e.rotulo)).toEqual([
      "Enviando",
      "Ouvindo",
      "Escrevendo",
      "Pronta para revisar",
    ]);
  });
  it("sabem quais já passaram", () => {
    expect(etapaConcluida("enviando", "escrevendo")).toBe(true);
    expect(etapaConcluida("escrevendo", "escrevendo")).toBe(false);
    expect(etapaConcluida("revisar", "ouvindo")).toBe(false);
  });
  it("só a última etapa encerra o processamento", () => {
    expect(emProcessamento("escrevendo")).toBe(true);
    expect(emProcessamento("revisar")).toBe(false);
    expect(rotuloDaEtapa("revisar")).toBe("Pronta para revisar");
  });
});
