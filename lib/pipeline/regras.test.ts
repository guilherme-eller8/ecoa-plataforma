import { describe, expect, it } from "vitest";
import { ESPERA_COMECAR_MIN, MAX_ARQUIVO_MIN } from "@/lib/config";
import {
  FRASES_ESPERA,
  MOTIVOS_ESPERA,
  motivoDaEspera,
  type MotivoEspera,
} from "./regras";

const AGORA = Date.parse("2026-11-16T09:00:00Z");
const ctx = {
  iaConfirmada: true,
  agora: AGORA,
  maxArquivoS: MAX_ARQUIVO_MIN * 60,
  esperaComecarMin: ESPERA_COMECAR_MIN,
};
const haMin = (min: number) => new Date(AGORA - min * 60_000).toISOString();
const gravacao = (
  extra: Partial<Parameters<typeof motivoDaEspera>[0]> = {},
) => ({
  processado: false,
  duracaoS: 51,
  loteIncompleto: false,
  recebidoEm: haMin(1),
  ...extra,
});

describe("motivo da espera (a tela nunca promete 'já vai começar' para sempre)", () => {
  it("recém-recebida: já vai começar", () => {
    expect(motivoDaEspera(gravacao(), ctx)).toBe("nao_recebido");
  });

  it("parada além do limite: admite a demora (o caso de 12 h de 16/11)", () => {
    expect(
      motivoDaEspera(
        gravacao({ recebidoEm: haMin(ESPERA_COMECAR_MIN + 1) }),
        ctx,
      ),
    ).toBe("demorando");
    expect(motivoDaEspera(gravacao({ recebidoEm: haMin(12 * 60) }), ctx)).toBe(
      "demorando",
    );
  });

  it("no limite exato ainda não é demora", () => {
    expect(
      motivoDaEspera(gravacao({ recebidoEm: haMin(ESPERA_COMECAR_MIN) }), ctx),
    ).toBe("nao_recebido");
  });

  it("os motivos de verdade vêm antes da demora", () => {
    const velha = { recebidoEm: haMin(60) };
    expect(motivoDaEspera(gravacao({ ...velha, processado: true }), ctx)).toBe(
      "descartada",
    );
    expect(motivoDaEspera(gravacao({ ...velha, duracaoS: null }), ctx)).toBe(
      "sem_duracao",
    );
    expect(
      motivoDaEspera(
        gravacao({ ...velha, duracaoS: MAX_ARQUIVO_MIN * 60 + 1 }),
        ctx,
      ),
    ).toBe("longa");
    expect(
      motivoDaEspera(gravacao(velha), { ...ctx, iaConfirmada: false }),
    ).toBe("sem_consentimento");
    expect(
      motivoDaEspera(gravacao({ ...velha, loteIncompleto: true }), ctx),
    ).toBe("lote_incompleto");
  });

  it("data de recebimento ausente ou inválida não vira demora", () => {
    expect(motivoDaEspera(gravacao({ recebidoEm: null }), ctx)).toBe(
      "nao_recebido",
    );
    expect(motivoDaEspera(gravacao({ recebidoEm: "x" }), ctx)).toBe(
      "nao_recebido",
    );
  });

  it("todo motivo tem selo e frase", () => {
    for (const m of Object.keys(MOTIVOS_ESPERA) as MotivoEspera[]) {
      expect(MOTIVOS_ESPERA[m].length).toBeGreaterThan(0);
      expect(FRASES_ESPERA[m].length).toBeGreaterThan(0);
    }
  });
});
