import { describe, expect, it } from "vitest";
import { PERGUNTAS, TEMAS } from "@/lib/perguntas/banco";
import {
  agruparPorFase,
  cabeNaFase,
  CATEGORIAS,
  faseDoItem,
  nomeDaFase,
  OUTRAS,
} from "./fases";

describe("fases da enquete", () => {
  it("8 fases da vida em ordem, e Outras por último", () => {
    expect(CATEGORIAS.map((c) => c.id)).toEqual([
      ...TEMAS.map((t) => t.id),
      "outras",
    ]);
    expect(CATEGORIAS).toHaveLength(9);
  });

  it("a fase vem do banco_id; sem banco_id é Outras", () => {
    expect(faseDoItem("infancia-03")).toBe("infancia");
    expect(faseDoItem("legado-25")).toBe("legado");
    expect(faseDoItem(null)).toBe("outras");
    expect(faseDoItem(undefined)).toBe("outras");
    expect(faseDoItem("inexistente-01")).toBe("outras");
  });

  it("toda pergunta do banco cai numa fase da vida", () => {
    expect(PERGUNTAS.every((p) => faseDoItem(p.id) === p.tema)).toBe(true);
  });

  it("agrupa em ordem cronológica e esconde fase vazia", () => {
    const itens = [
      { id: "a", fase: "amor" },
      { id: "b", fase: "outras" },
      { id: "c", fase: "infancia" },
      { id: "d", fase: "infancia" },
    ];
    const g = agruparPorFase(itens, (i) => i.fase);
    expect(g.map((x) => x.categoria.id)).toEqual([
      "infancia",
      "amor",
      "outras",
    ]);
    expect(g[0].itens.map((i) => i.id)).toEqual(["c", "d"]);
  });

  it("fase desconhecida vai para Outras", () => {
    const g = agruparPorFase([{ fase: "xyz" }], (i) => i.fase);
    expect(g[0].categoria).toEqual(OUTRAS);
  });

  it("até 2 por fase", () => {
    expect(cabeNaFase(0)).toBe(true);
    expect(cabeNaFase(1)).toBe(true);
    expect(cabeNaFase(2)).toBe(false);
  });

  it("nome da fase", () => {
    expect(nomeDaFase("infancia")).toBe("Infância");
    expect(nomeDaFase("outras")).toBe("Outras perguntas");
  });
});
