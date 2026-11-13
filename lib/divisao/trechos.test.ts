import { describe, expect, it } from "vitest";
import {
  cargaDoConfirmar,
  cortarTrechos,
  juntar,
  montar,
  relogio,
  renomear,
  responderSugestao,
  separar,
  tirar,
  type SegmentoTela,
} from "./trechos";

// Gravação g1: segmentos 1–12 de 10 s, com uma pausa de 3 s depois do 4.
const seg = (id: number, gravacao = "g1", parte = 1): SegmentoTela => ({
  id,
  gravacao,
  parte,
  inicio: (id - 1) * 10 + (id > 4 ? 3 : 0),
  fim: (id - 1) * 10 + 10 + (id > 4 ? 3 : 0),
  texto: `fala ${id}`,
});
const segs = Array.from({ length: 12 }, (_, i) => seg(i + 1));

describe("cortarTrechos", () => {
  it("corta perto do alvo e prefere a pausa longa", () => {
    const t = cortarTrechos(segs, 60);
    // Depois de 40 s (60% de 60) vem uma pausa de 3 s: corta ali.
    expect(t.map((x) => x.ids)).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10],
      [11, 12],
    ]);
  });

  it("nunca junta gravações diferentes nem ids que não são vizinhos", () => {
    const misto = [seg(1), seg(2), seg(3, "g2", 2), seg(5)];
    expect(cortarTrechos(misto, 600).map((x) => x.ids)).toEqual([
      [1, 2],
      [3],
      [5],
    ]);
  });
});

const lista = () =>
  montar(
    [
      { titulo: "A", segmentos: [[1, 6]], promptId: null, sugeridaId: "p1" },
      { titulo: "B", segmentos: [[7, 12]], promptId: null, sugeridaId: null },
    ],
    segs,
    20,
  );

describe("ações de 1 toque", () => {
  it("juntar une com a de baixo e mantém o título de cima", () => {
    const r = juntar(lista(), 0);
    expect(r).toHaveLength(1);
    expect(r[0].titulo).toBe("A");
    expect(r[0].trechos.flatMap((t) => t.ids)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it("separar corta antes do trecho escolhido; a nova vem sem título", () => {
    const r = separar(lista(), 0, 1);
    expect(r).toHaveLength(3);
    expect(r[1].titulo).toBeNull();
    expect(separar(lista(), 0, 0)).toEqual(lista()); // no começo: nada muda
  });

  it("tirar remove o trecho; história sem trecho sai da lista", () => {
    let r = lista();
    const n = r[1].trechos.length;
    for (let k = 0; k < n; k++) r = tirar(r, 1, 0);
    expect(r).toHaveLength(1);
  });

  it("renomear apara; vazio vira null", () => {
    expect(renomear(lista(), 0, "  Guarapari ")[0].titulo).toBe("Guarapari");
    expect(renomear(lista(), 0, "   ")[0].titulo).toBeNull();
  });

  it("sugestão: aceitar vira pergunta; ignorar não volta", () => {
    expect(responderSugestao(lista(), 0, true)[0]).toMatchObject({
      promptId: "p1",
      sugeridaId: null,
    });
    expect(responderSugestao(lista(), 0, false)[0]).toMatchObject({
      promptId: null,
      sugeridaId: null,
      ignorada: true,
    });
  });

  it("a carga do confirmar segue a ordem da fala, com ids em ordem", () => {
    const r = juntar(separar(lista(), 1, 1), 0);
    expect(cargaDoConfirmar(r)).toEqual([
      {
        titulo: "A",
        segmentos: [1, 2, 3, 4, 5, 6, 7, 8],
        prompt_id: null,
        sugerida: "p1",
        ignorada: false,
      },
      expect.objectContaining({ titulo: null, segmentos: [9, 10, 11, 12] }),
    ]);
  });
});

it("relogio", () => {
  expect(relogio(750)).toBe("12:30");
  expect(relogio(3725)).toBe("1:02:05");
});
