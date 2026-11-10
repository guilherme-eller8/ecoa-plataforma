import { describe, expect, it } from "vitest";
import {
  causos,
  historias,
  paginasDaHistoria,
  perguntas,
  proximaPergunta,
  resumoDoLivro,
} from "./livro-jair";

// Os números que a tela mostra têm de bater entre si.
describe("dados de exemplo do livro do Jair", () => {
  const r = resumoDoLivro();

  it("as contagens somam o total de histórias", () => {
    expect(r.prontas + r.paraRevisar + r.emAndamento).toBe(historias.length);
    expect(r.total).toBe(historias.length);
  });

  it("as páginas são a soma das histórias, e só contam histórias com texto", () => {
    expect(r.paginas).toBe(
      historias.reduce((s, h) => s + paginasDaHistoria(h), 0),
    );
    for (const h of historias)
      if (h.palavras === 0) expect(paginasDaHistoria(h)).toBe(0);
    expect(r.paginas).toBeLessThanOrEqual(r.paginasInclusas);
  });

  it("a próxima pergunta ainda não foi enviada, e quem pediu tem um causo", () => {
    expect(proximaPergunta.estado).toBe("para_enviar");
    if (proximaPergunta.pedidaPor) {
      expect(causos.some((c) => c.quem === proximaPergunta.pedidaPor)).toBe(
        true,
      );
    }
  });

  it("perguntas enviadas sabem há quantos dias foram", () => {
    for (const p of perguntas.filter((p) => p.estado === "enviada")) {
      expect(p.enviadaHaDias).toBeGreaterThanOrEqual(0);
    }
  });
});
