import { describe, expect, it } from "vitest";
import { estadoEfetivo, podeEscrever } from "./passe";

const agora = new Date("2026-12-24T12:00:00Z");

describe("estadoEfetivo", () => {
  it("ativo no prazo continua ativo", () => {
    const p = {
      passe_estado: "ativo",
      passe_vence_em: "2027-12-24T12:00:00Z",
    } as const;
    expect(estadoEfetivo(p, agora)).toBe("ativo");
    expect(podeEscrever(p, agora)).toBe(true);
  });

  it("ativo vencido vira somente leitura antes do job", () => {
    const p = {
      passe_estado: "ativo",
      passe_vence_em: "2026-12-23T12:00:00Z",
    } as const;
    expect(estadoEfetivo(p, agora)).toBe("somente_leitura");
    expect(podeEscrever(p, agora)).toBe(false);
  });

  it("vencimento exatamente agora já é somente leitura (igual ao banco)", () => {
    expect(
      estadoEfetivo(
        { passe_estado: "ativo", passe_vence_em: agora.toISOString() },
        agora,
      ),
    ).toBe("somente_leitura");
  });

  it("somente leitura e pendente ficam como estão", () => {
    expect(
      estadoEfetivo(
        { passe_estado: "somente_leitura", passe_vence_em: null },
        agora,
      ),
    ).toBe("somente_leitura");
    expect(
      estadoEfetivo({ passe_estado: "pendente", passe_vence_em: null }, agora),
    ).toBe("pendente");
    expect(
      podeEscrever({ passe_estado: "pendente", passe_vence_em: null }, agora),
    ).toBe(false);
  });
});
