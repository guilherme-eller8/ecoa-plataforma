import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gravarBaixada, idDaPasta, montarSaida } from "./baixar";
import { lerSaidaIA } from "./saidas";

const H = "abcdef12-0000-4000-8000-000000000000";
const dados = {
  historia: H,
  arquivo: "a.m4a",
  geradaEm: "2026-11-11T12:00:00Z",
  provedor: "elevenlabs",
  modeloTranscricao: "scribe_v1",
  modelos: { rapido: "r", capaz: "c" },
  hashPrompts: { editar: "abc" },
  tamanho: "medio",
  edicao: {
    titulo: "A fazenda",
    paragrafos: [{ texto: "Era longe.", fontes: [1] }],
    lacunas: [],
  },
  marcacoes: [],
  segmentos: [
    { id: 1, arquivo: H, inicio: 0, fim: 1, falante: `${H}:A`, texto: "era longe" },
  ],
};

describe("--baixar", () => {
  it("grava no formato que o --comparar lê", () => {
    const dir = mkdtempSync(join(tmpdir(), "baixar-"));
    const pasta = gravarBaixada(dir, montarSaida(dados));
    expect(pasta.endsWith(idDaPasta(H))).toBe(true);
    const saida = lerSaidaIA(pasta);
    expect(saida.edicao.titulo).toBe("A fazenda");
    expect(saida.segmentos).toHaveLength(1);
    expect(readFileSync(join(pasta, "ia.md"), "utf8")).toContain("# A fazenda");
  });

  it("não sobrescreve o que a família já corrigiu", () => {
    const dir = mkdtempSync(join(tmpdir(), "baixar-"));
    const pasta = gravarBaixada(dir, montarSaida(dados));
    writeFileSync(join(pasta, "editado.md"), "# Corrigido");
    writeFileSync(join(pasta, "ia.json"), "{}");
    gravarBaixada(dir, montarSaida(dados));
    expect(readFileSync(join(pasta, "ia.json"), "utf8")).toBe("{}");
    expect(existsSync(join(pasta, "editado.md"))).toBe(true);
  });
});
