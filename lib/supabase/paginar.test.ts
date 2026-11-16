import { describe, expect, it } from "vitest";
import { lerEmBlocos } from "./paginar";

/** Banco falso com `total` linhas e uma API que corta em `maxRows`, como o PostgREST. */
function api(total: number, maxRows: number) {
  const pedidos: [number, number][] = [];
  const bloco = async (de: number, ate: number) => {
    pedidos.push([de, ate]);
    const fim = Math.min(ate + 1, total, de + maxRows);
    return {
      data: Array.from({ length: Math.max(0, fim - de) }, (_, i) => de + i),
      error: null,
    };
  };
  return { bloco, pedidos };
}

describe("lerEmBlocos", () => {
  it("lê 2.500 linhas por uma API que corta em 1.000", async () => {
    const { bloco, pedidos } = api(2500, 1000);
    const linhas = await lerEmBlocos(bloco, 20000);
    expect(linhas).toHaveLength(2500);
    expect(new Set(linhas).size).toBe(2500);
    expect(pedidos).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("para no limite pedido", async () => {
    const { bloco } = api(5000, 1000);
    expect(await lerEmBlocos(bloco, 1500)).toHaveLength(1500);
  });

  it("um total múltiplo do bloco termina com um pedido vazio", async () => {
    const { bloco, pedidos } = api(2000, 1000);
    expect(await lerEmBlocos(bloco, 20000)).toHaveLength(2000);
    expect(pedidos).toHaveLength(3);
  });

  it("erro do banco vira erro, sem devolver meia leitura", async () => {
    await expect(
      lerEmBlocos(async () => ({ data: null, error: { code: "x" } }), 10),
    ).rejects.toThrow("Não deu para ler do banco.");
  });
});
