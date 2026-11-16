import { describe, expect, it } from "vitest";
import {
  ALERTA_GASTO_DIA_BRL,
  ALERTA_GASTO_LIVRO_BRL,
  COTACAO_USD_BRL,
} from "@/lib/config";
import { alertasDe, chaveDoAlerta, type FotoDosAlertas } from "./alertas";

const LIVRO = "00000000-0000-4000-8000-0000000000a1";
const usd = (brl: number) => brl / COTACAO_USD_BRL;
const calma: FotoDosAlertas = {
  filaParada: [],
  gastoHojeUSD: 0,
  livrosNoTeto: [],
  semana: { gastoUSD: 0, perdaUSD: 0 },
  cotas: [],
};

describe("alertasDe", () => {
  it("dia calmo: nenhum alerta", () => {
    expect(alertasDe(calma)).toEqual([]);
  });

  it("fila parada: um alerta com a contagem e a maior espera", () => {
    const [a] = alertasDe({
      ...calma,
      filaParada: [
        { id: "aaaaaaaa-1", book_id: LIVRO, esperaMin: 31 },
        { id: "bbbbbbbb-2", book_id: LIVRO, esperaMin: 95.4 },
      ],
    });
    expect(a.condicao).toBe("fila_parada");
    expect(a.linhas[0]).toContain("2 gravação(ões)");
    expect(a.linhas[0]).toContain("95 min");
  });

  it("gasto do dia só acima do limite", () => {
    expect(
      alertasDe({ ...calma, gastoHojeUSD: usd(ALERTA_GASTO_DIA_BRL - 0.01) }),
    ).toEqual([]);
    expect(
      alertasDe({ ...calma, gastoHojeUSD: usd(ALERTA_GASTO_DIA_BRL + 1) })[0]
        .condicao,
    ).toBe("gasto_dia");
  });

  it("gasto do livro avisa só no dia em que passou do teto", () => {
    const passouHoje = alertasDe({
      ...calma,
      livrosNoTeto: [
        {
          book_id: LIVRO,
          totalUSD: usd(ALERTA_GASTO_LIVRO_BRL + 2),
          hojeUSD: usd(5),
        },
      ],
    });
    expect(passouHoje.map((a) => a.condicao)).toEqual(["gasto_livro"]);
    expect(passouHoje[0].livro).toBe(LIVRO);
    const passouAntes = alertasDe({
      ...calma,
      livrosNoTeto: [
        {
          book_id: LIVRO,
          totalUSD: usd(ALERTA_GASTO_LIVRO_BRL + 10),
          hojeUSD: usd(1),
        },
      ],
    });
    expect(passouAntes).toEqual([]);
  });

  it("perda em falhas: acima de 5% e só com gasto mínimo na semana", () => {
    expect(
      alertasDe({ ...calma, semana: { gastoUSD: 0.01, perdaUSD: 0.01 } }),
    ).toEqual([]);
    expect(
      alertasDe({
        ...calma,
        semana: { gastoUSD: usd(10), perdaUSD: usd(0.4) },
      }),
    ).toEqual([]);
    expect(
      alertasDe({
        ...calma,
        semana: { gastoUSD: usd(10), perdaUSD: usd(1) },
      })[0].condicao,
    ).toBe("perda");
  });

  it("cota: um alerta por livro, com pedidos e minutos", () => {
    const [a] = alertasDe({
      ...calma,
      cotas: [{ book_id: LIVRO, pedidos: 33, minutos: 12.4 }],
    });
    expect(a).toMatchObject({ condicao: "cota", livro: LIVRO });
    expect(a.linhas.join(" ")).toContain("33 de 40");
  });

  it("nenhum alerta leva mais que o id curto do livro", () => {
    const todos = alertasDe({
      filaParada: [{ id: LIVRO, book_id: LIVRO, esperaMin: 40 }],
      gastoHojeUSD: 100,
      livrosNoTeto: [{ book_id: LIVRO, totalUSD: 100, hojeUSD: 100 }],
      semana: { gastoUSD: 100, perdaUSD: 50 },
      cotas: [{ book_id: LIVRO, pedidos: 40, minutos: 240 }],
    });
    expect(todos).toHaveLength(5);
    const texto = JSON.stringify(todos.map((a) => [a.titulo, a.linhas]));
    expect(texto).not.toContain(LIVRO);
  });
});

describe("chaveDoAlerta", () => {
  it("uma por condição, livro, dia e admin", () => {
    const [a] = alertasDe({ ...calma, gastoHojeUSD: 100 });
    expect(chaveDoAlerta(a, "2026-12-24", "adm")).toBe(
      "alerta:gasto_dia:todos:2026-12-24:adm",
    );
  });
});
