import { describe, expect, it } from "vitest";
import { podeLembrar } from "./dados";

const DIA = 86_400_000;
const agora = Date.parse("2026-11-14T12:00:00Z");
const ha = (dias: number) => new Date(agora - dias * DIA).toISOString();

describe("Lembrar com carinho (P62)", () => {
  it("só pergunta enviada há 3 dias ou mais", () => {
    expect(podeLembrar("enviada", ha(3), null, agora)).toBe(true);
    expect(podeLembrar("enviada", ha(2.9), null, agora)).toBe(false);
    expect(podeLembrar("para_enviar", ha(10), null, agora)).toBe(false);
    expect(podeLembrar("enviada", null, null, agora)).toBe(false);
  });
  it("o botão volta 3 dias depois do último lembrete", () => {
    expect(podeLembrar("enviada", ha(10), ha(1), agora)).toBe(false);
    expect(podeLembrar("enviada", ha(10), ha(3), agora)).toBe(true);
  });
});
