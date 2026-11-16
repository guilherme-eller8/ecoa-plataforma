import { describe, expect, it } from "vitest";
import { cabemNaCota } from "./fila";

const g = (id: string, livro: string, min: number | null) => ({
  id,
  book_id: livro,
  duracao_s: min === null ? null : min * 60,
});

describe("cabemNaCota (T56)", () => {
  it("a cota adiada não reenvia o que o banco vai recusar", () => {
    const lista = [g("a", "L1", 30), g("b", "L1", 30), g("c", "L1", 30)];
    const r = cabemNaCota(lista, new Map([["L1", 190]]), 240);
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });
  it("cada livro tem a sua cota; sem duração sempre passa (o pipeline mede)", () => {
    const lista = [g("a", "L1", 200), g("b", "L2", 30), g("c", "L1", null)];
    const r = cabemNaCota(lista, new Map([["L1", 100]]), 240);
    expect(r.map((x) => x.id)).toEqual(["b", "c"]);
  });
  it("cota zerada no dia seguinte: tudo que cabe volta", () => {
    const lista = [g("a", "L1", 120), g("b", "L1", 120), g("c", "L1", 1)];
    expect(cabemNaCota(lista, new Map(), 240).map((x) => x.id)).toEqual([
      "a",
      "b",
    ]);
  });
});
