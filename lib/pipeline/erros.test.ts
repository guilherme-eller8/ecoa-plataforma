import { describe, expect, it } from "vitest";
import { ErroIA } from "@/lib/ai/claude";
import {
  CODIGOS,
  CODIGOS_DEFINITIVOS,
  ErroPipeline,
  ehDefinitivo,
} from "./erros";
import { FRASE_DA_FALHA, tipoDeFalha } from "./regras";

describe("erros definitivos (não repetem o passo)", () => {
  it("áudio sem fala, recusa e resposta cortada param na hora", () => {
    for (const codigo of [
      "audio_sem_fala",
      "transcricao_vazia",
      "ia_recusou",
      "resposta_cortada",
    ] as const)
      expect(ehDefinitivo(new ErroPipeline("editar", codigo))).toBe(true);
  });

  it("falha do provedor e JSON inválido continuam repetindo", () => {
    for (const codigo of [
      "scribe_falhou",
      "ia_api",
      "json_invalido",
      "erro_inesperado",
    ] as const)
      expect(ehDefinitivo(new ErroPipeline("editar", codigo))).toBe(false);
  });

  it("só vale para ErroPipeline, e todo código definitivo existe na lista", () => {
    expect(ehDefinitivo(new ErroIA("x", undefined, "recusa"))).toBe(false);
    expect(ehDefinitivo(new Error("editar:ia_recusou"))).toBe(false);
    for (const c of CODIGOS_DEFINITIVOS) expect(CODIGOS).toContain(c);
  });
});

describe("tipo de falha mostrado à pessoa", () => {
  it("sem fala no áudio tem frase própria; o resto é geral", () => {
    expect(tipoDeFalha("audio_sem_fala")).toBe("sem_fala");
    expect(tipoDeFalha("transcricao_vazia")).toBe("sem_fala");
    expect(tipoDeFalha("json_invalido")).toBe("geral");
    expect(tipoDeFalha(null)).toBe("geral");
    expect(FRASE_DA_FALHA.sem_fala).toMatch(/Grave de novo/);
  });
});
