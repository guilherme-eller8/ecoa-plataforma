import { describe, expect, it } from "vitest";
import {
  ranking,
  topN,
  totalDeVotantes,
  type ItemDaEnquete,
  type VotoDaEnquete,
} from "./ranking";

const item = (id: string, ordem: number): ItemDaEnquete => ({
  id,
  texto: `Pergunta ${id}`,
  ordem,
  prompt_id: null,
  banco_id: null,
});
const voto = (
  poll_item_id: string,
  votante: string,
  nome: string,
  s: number,
): VotoDaEnquete => ({
  poll_item_id,
  votante,
  nome,
  criado_em: `2026-11-10T12:00:${String(s).padStart(2, "0")}Z`,
});

const itens = [item("a", 0), item("b", 1), item("c", 2), item("d", 3)];
const votos = [
  voto("b", "v1", "Ana", 1),
  voto("c", "v1", "Ana", 1),
  voto("b", "v2", "Ana", 2), // a mesma Ana em outro aparelho
  voto("c", "v3", "Caio", 3),
  voto("a", "v3", "Caio", 3),
];

describe("ranking da enquete", () => {
  it("ordena por votos e desempata pela ordem do item", () => {
    const r = ranking(itens, votos);
    expect(r.map((l) => [l.id, l.votos, l.posicao])).toEqual([
      ["b", 2, 1],
      ["c", 2, 2],
      ["a", 1, 3],
      ["d", 0, 4],
    ]);
  });

  it("uma entrada por votante, em ordem de chegada", () => {
    const b = ranking(itens, votos).find((l) => l.id === "b")!;
    expect(b.votantes).toEqual([
      { votante: "v1", nome: "Ana" },
      { votante: "v2", nome: "Ana" },
    ]);
  });

  it("top N só com itens votados, sem esticar no empate", () => {
    const r = ranking(itens, votos);
    expect(topN(r, 2).map((l) => l.id)).toEqual(["b", "c"]);
    expect(topN(r, 10).map((l) => l.id)).toEqual(["b", "c", "a"]);
    expect(topN(r, 0)).toEqual([]);
  });

  it("conta pessoas distintas", () => {
    expect(totalDeVotantes(votos)).toBe(3);
  });
});
