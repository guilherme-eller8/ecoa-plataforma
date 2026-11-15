import { describe, expect, it } from "vitest";
import type { Palavra } from "./schemas";
import { sinaisDaTranscricao } from "./sinais";

const p = (
  fim: number,
  confianca: number | null,
  falante: string | null = "speaker_0",
): Palavra => ({ texto: "x", inicio: fim - 0.3, fim, falante, confianca });

describe("sinaisDaTranscricao", () => {
  it("conta palavras, duvidosas, falantes, confiança média e cobertura", () => {
    const s = sinaisDaTranscricao(
      [p(1, 0.99), p(2, 0.4), p(3, 0.9, "speaker_1"), p(45, null)],
      60,
    );
    expect(s).toEqual({
      palavras: 4,
      com_confianca: 3,
      duvidosas: 1,
      falantes: 2,
      confianca_pct: 76.3,
      cobertura_pct: 75,
    });
  });

  it("sem confiança nem duração: só as contagens, e tudo é número", () => {
    const s = sinaisDaTranscricao([p(1, null, null)], null);
    expect(s).toEqual({
      palavras: 1,
      com_confianca: 0,
      duvidosas: 0,
      falantes: 0,
    });
    for (const v of Object.values(s)) expect(typeof v).toBe("number");
  });

  it("áudio vazio não divide por zero", () => {
    expect(sinaisDaTranscricao([], 0)).toEqual({
      palavras: 0,
      com_confianca: 0,
      duvidosas: 0,
      falantes: 0,
    });
  });
});
