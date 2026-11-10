import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  hashPrompts,
  leitorDeDiretorio,
  montarPrompt,
} from "./carregar-prompt";

const arquivos: Record<string, string> = {
  base: "Início\n{{> _parte}}\nFim {{nome}}",
  _parte: "Parte com {{nome}}\n",
  circular: "{{> circular}}",
};
const ler = (n: string) => arquivos[n];

describe("montarPrompt", () => {
  it("inclui arquivos e preenche valores", () => {
    expect(montarPrompt(ler, "base", { nome: "Nelson" })).toBe(
      "Início\nParte com Nelson\nFim Nelson",
    );
  });

  it("falha com valor faltando ou inclusão circular", () => {
    expect(() => montarPrompt(ler, "base")).toThrow(/nome/);
    expect(() => montarPrompt(ler, "circular")).toThrow(/circular/);
  });

  it("monta os prompts reais sem erro", () => {
    const real = leitorDeDiretorio(join(process.cwd(), "lib/ai/prompts"));
    expect(montarPrompt(real, "editar")).toContain("Regras invioláveis");
    expect(montarPrompt(real, "editar")).not.toContain("lição valiosa");
    expect(Object.keys(hashPrompts(real, ["editar", "_regras"]))).toEqual([
      "editar",
      "_regras",
    ]);
  });
});
