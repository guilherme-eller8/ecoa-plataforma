import { describe, expect, it } from "vitest";
import { PERGUNTAS_INICIAIS } from "@/lib/config";
import { PARENTESCOS } from "@/lib/supabase/tipos";
import {
  PERGUNTAS,
  TEMAS,
  iniciaisDo,
  perguntaPorId,
  perguntasDoTema,
} from "./banco";

describe("banco de perguntas", () => {
  it("tem 150 perguntas em 8 temas, com ids únicos", () => {
    expect(PERGUNTAS).toHaveLength(150);
    expect(TEMAS).toHaveLength(8);
    expect(new Set(PERGUNTAS.map((p) => p.id)).size).toBe(150);
  });

  it("todo tema tem pelo menos 15 perguntas", () => {
    for (const t of TEMAS)
      expect(perguntasDoTema(t.id).length).toBeGreaterThanOrEqual(15);
  });

  it.each(PARENTESCOS)(
    "%s: 1 inicial por fase da vida, em ordem, sem nenhuma de fé",
    (parentesco) => {
      const iniciais = iniciaisDo(parentesco);
      expect(iniciais).toHaveLength(PERGUNTAS_INICIAIS);
      expect(iniciais.map((p) => p.tema)).toEqual(TEMAS.map((t) => t.id));
      expect(iniciais.every((p) => p && !p.fe)).toBe(true);
    },
  );

  it("sem parentesco usa o conjunto 'outro'", () => {
    expect(iniciaisDo(null)).toEqual(iniciaisDo("outro"));
  });

  it("o filtro de fé separa as perguntas", () => {
    const todas = perguntasDoTema("legado");
    const semFe = perguntasDoTema("legado", { fe: false });
    const soFe = perguntasDoTema("legado", { fe: true });
    expect(semFe.length + soFe.length).toBe(todas.length);
    expect(soFe.length).toBeGreaterThan(0);
  });

  it("cabe na coluna prompts.texto (500) e é encontrada pelo id", () => {
    for (const p of PERGUNTAS) {
      expect(p.texto.length).toBeLessThanOrEqual(300);
      expect(perguntaPorId(p.id)).toBe(p);
    }
  });
});
