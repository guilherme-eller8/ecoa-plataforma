import { describe, expect, it } from "vitest";
import { temAlgo } from "./enviar";
import { idDoResumo } from "./eventos";

describe("resumo semanal (P63)", () => {
  it("o id do evento é por livro e dia de Brasília", () => {
    // 19 h de domingo em Brasília = 22 h UTC do mesmo dia.
    expect(idDoResumo("L", new Date("2026-11-15T22:00:00Z"))).toBe(
      "resumo-L-2026-11-15",
    );
    // 23 h em Brasília já é segunda em UTC: o dia continua o de Brasília.
    expect(idDoResumo("L", new Date("2026-11-16T02:00:00Z"))).toBe(
      "resumo-L-2026-11-15",
    );
  });

  it("só sai se houver história nova ou pergunta esperando", () => {
    const zero = { historiasNovas: 0, perguntasEsperando: 0, paginasEstimadas: 30 };
    expect(temAlgo(zero)).toBe(false);
    expect(temAlgo({ ...zero, historiasNovas: 1 })).toBe(true);
    expect(temAlgo({ ...zero, perguntasEsperando: 2 })).toBe(true);
  });
});
