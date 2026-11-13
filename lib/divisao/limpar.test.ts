import { describe, expect, it } from "vitest";
import type { Divisao, Segmento } from "@/lib/ai/schemas";
import { comprimir, expandir, limparDivisao } from "./limpar";

// 12 segmentos de 10 s: g1 = 1–4, g2 = 5–8, g3 = 9–12.
const segs: Segmento[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  arquivo: `g${Math.floor(i / 4) + 1}`,
  inicio: i * 10,
  fim: i * 10 + 10,
  falante: `g${Math.floor(i / 4) + 1}:speaker_0`,
  texto: "fala",
}));

const h = (
  titulo: string,
  trechos: [number, number][],
  pergunta: number | null = null,
) => ({
  titulo,
  trechos: trechos.map(([de, ate]) => ({ de, ate })),
  pergunta,
});

const limpar = (
  d: Divisao,
  extra: Partial<Parameters<typeof limparDivisao>[1]> = {},
) =>
  limparDivisao(d, {
    segmentos: segs,
    perguntas: [],
    minFalaS: 30,
    maxHistorias: 30,
    ...extra,
  });

describe("faixas", () => {
  it("comprimir e expandir são inversos", () => {
    expect(comprimir([5, 1, 2, 3, 7, 8])).toEqual([
      [1, 3],
      [5, 5],
      [7, 8],
    ]);
    expect(
      expandir([
        [1, 3],
        [7, 8],
      ]),
    ).toEqual([1, 2, 3, 7, 8]);
  });
});

describe("limparDivisao", () => {
  it("cada segmento com um dono; o 1º que pede fica", () => {
    const r = limpar({ historias: [h("A", [[1, 6]]), h("B", [[5, 12]])] });
    expect(r.historias.map((x) => x.segmentos)).toEqual([[[1, 6]], [[7, 12]]]);
  });

  it("buraco vai para a história anterior; no começo, para a seguinte", () => {
    const r = limpar({ historias: [h("A", [[3, 5]]), h("B", [[9, 12]])] });
    expect(r.historias.map((x) => x.segmentos)).toEqual([[[1, 8]], [[9, 12]]]);
  });

  it("faixa inventada é ignorada; sem nenhuma, tudo vira uma história", () => {
    expect(
      limpar({ historias: [h("A", [[90, 99]])] }).historias[0].segmentos,
    ).toEqual([[1, 12]]);
    expect(limpar({ historias: [] }).historias).toHaveLength(1);
  });

  it("junta assunto que volta (mesma história em gravações diferentes)", () => {
    const r = limpar({
      historias: [
        h("Guarapari", [
          [1, 3],
          [9, 12],
        ]),
        h("Escola", [[4, 8]]),
      ],
    });
    expect(r.historias[0]).toMatchObject({
      titulo: "Guarapari",
      segmentos: [
        [1, 3],
        [9, 12],
      ],
    });
  });

  it("história com menos de 30 s junta com a vizinha", () => {
    const r = limpar({
      historias: [h("A", [[1, 5]]), h("Curta", [[6, 7]]), h("C", [[8, 12]])],
    });
    expect(r.historias.map((x) => x.titulo)).toEqual(["A", "C"]);
    expect(r.historias[0].segmentos).toEqual([[1, 7]]);
  });

  it("acima do teto, o excesso entra na última", () => {
    const r = limpar(
      {
        historias: [h("A", [[1, 4]]), h("B", [[5, 8]]), h("C", [[9, 12]])],
      },
      { maxHistorias: 2 },
    );
    expect(r.historias.map((x) => x.segmentos)).toEqual([[[1, 4]], [[5, 12]]]);
  });

  it("título vazio vira null e é cortado em 200", () => {
    const r = limpar({
      historias: [h("  ", [[1, 6]]), h("x".repeat(300), [[7, 12]])],
    });
    expect(r.historias[0].titulo).toBeNull();
    expect(r.historias[1].titulo).toHaveLength(200);
  });

  it("pergunta pendente vira sugestão, uma vez só; fora da lista, nada", () => {
    const perguntas = [{ id: "p1", ligadaA: [] }];
    const r = limpar(
      {
        historias: [h("A", [[1, 6]], 1), h("B", [[7, 12]], 1)],
      },
      { perguntas },
    );
    expect(r.historias.map((x) => x.sugeridaId)).toEqual(["p1", null]);
    expect(
      limpar({ historias: [h("A", [[1, 12]], 7)] }, { perguntas }).historias[0]
        .sugeridaId,
    ).toBeNull();
  });

  it("pergunta ligada no envio é definitiva; sem dono, vai para quem tem mais da gravação", () => {
    const perguntas = [{ id: "pg3", ligadaA: ["g3"] }];
    const r = limpar(
      { historias: [h("A", [[1, 8]]), h("B", [[9, 12]])] },
      { perguntas },
    );
    expect(r.historias.map((x) => x.promptId)).toEqual([null, "pg3"]);
  });
});
