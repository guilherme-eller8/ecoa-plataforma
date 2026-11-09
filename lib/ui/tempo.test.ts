import { describe, expect, it } from "vitest";
import { falarDuracao, formatarCronometro } from "./tempo";

describe("formatarCronometro", () => {
  it("formata minutos e segundos", () => {
    expect(formatarCronometro(0)).toBe("0:00");
    expect(formatarCronometro(75)).toBe("1:15");
    expect(formatarCronometro(599)).toBe("9:59");
  });
  it("mostra horas quando passa de 60 minutos", () => {
    expect(formatarCronometro(3725)).toBe("1:02:05");
  });
  it("nunca mostra número negativo ou quebrado", () => {
    expect(formatarCronometro(-5)).toBe("0:00");
    expect(formatarCronometro(61.9)).toBe("1:01");
    expect(formatarCronometro(Number.NaN)).toBe("0:00");
  });
});

describe("falarDuracao", () => {
  it("fala a duração por extenso curto", () => {
    expect(falarDuracao(42)).toBe("42 s");
    expect(falarDuracao(120)).toBe("2 min");
    expect(falarDuracao(412)).toBe("6 min 52 s");
  });
});
