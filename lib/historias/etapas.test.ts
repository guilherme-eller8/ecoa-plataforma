import { describe, expect, it } from "vitest";
import { ETAPAS } from "@/lib/ui/etapas";
import { ETAPA_DO_ESTADO } from "@/lib/pipeline/regras";
import { estadoDoCartao } from "./etapas";

describe("estado da história → cartão", () => {
  it("cada estado do banco tem um estado no cartão", () => {
    expect(estadoDoCartao("ouvindo")).toBe("ouvindo");
    expect(estadoDoCartao("escrevendo")).toBe("escrevendo");
    expect(estadoDoCartao("pronta")).toBe("revisar");
    expect(estadoDoCartao("pronta", true)).toBe("pronta");
    expect(estadoDoCartao("falhou")).toBe("falhou");
    expect(estadoDoCartao("dividindo")).toBe("separando");
    expect(estadoDoCartao("separar")).toBe("conferir");
  });

  it("o canal publica só etapas que o cartão conhece", () => {
    // separando e conferir têm ramo próprio no cartão (fora do passo a passo de 4 etapas).
    const ids = new Set<string>([
      ...ETAPAS.map((e) => e.id),
      "falhou",
      "separando",
      "conferir",
    ]);
    for (const etapa of Object.values(ETAPA_DO_ESTADO))
      expect(ids.has(etapa)).toBe(true);
  });
});
