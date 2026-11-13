import { describe, expect, it } from "vitest";
import type { Marcacao } from "@/lib/ai/schemas";
import type { Paragrafo } from "./conteudo";
import {
  comporProposta,
  diferencaPorPalavra,
  mudancaDeTrecho,
  mudancasDeAudio,
  mudancasDeTamanho,
  mudancasVencidas,
  paraPontos,
  paraUtf16,
  type Proposta,
} from "./propostas";

const par = (
  id: string,
  texto: string,
  fontes: number[],
  editado = false,
): Paragrafo => ({
  id,
  texto,
  fontes,
  editado,
});

function ids() {
  let n = 0;
  return () => `n-${++n}`;
}

const atual = [
  par("p1", "Um.", [1, 2]),
  par("p2", "Dois, editado à mão.", [3], true),
  par("p3", "Três.", [4]),
  par("p4", "Quatro.", [5]),
];

const proposta = (p: Partial<Proposta>): Proposta => ({
  id: "x",
  tipo: "tamanho",
  mudancas: [],
  ordem: null,
  marcacoes: [],
  pedido: {},
  ...p,
});

describe("mudancasDeTamanho", () => {
  it("troca o marcador pelo travado e agrupa por fontes em comum", () => {
    const { mudancas, ordem } = mudancasDeTamanho(
      atual,
      [
        { texto: "Um e dois, longo.", fontes: [1, 2] },
        { travado: "p2" },
        { texto: "Três e quatro.", fontes: [4, 5] },
        { texto: "Algo novo.", fontes: [9] },
      ],
      ids(),
    );
    expect(ordem).toEqual(["n-1", "p2", "n-2", "n-3"]);
    expect(mudancas).toEqual([
      {
        id: "m1",
        tira: [{ id: "p1", texto: "Um." }],
        poe: [par("n-1", "Um e dois, longo.", [1, 2])],
        depois_de: null,
      },
      {
        id: "m2",
        tira: [
          { id: "p3", texto: "Três." },
          { id: "p4", texto: "Quatro." },
        ],
        poe: [par("n-2", "Três e quatro.", [4, 5])],
        depois_de: null,
      },
      {
        id: "m3",
        tira: [],
        poe: [par("n-3", "Algo novo.", [9])],
        depois_de: "n-2",
      },
    ]);
  });

  it("travado esquecido volta no lugar; travado inventado ou repetido é ignorado; nada tira travado", () => {
    const { mudancas, ordem } = mudancasDeTamanho(
      atual,
      [
        { texto: "Um.", fontes: [1] },
        { travado: "p1" },
        { texto: "Quatro.", fontes: [5] },
        { travado: "zz" },
      ],
      ids(),
    );
    expect(ordem).toEqual(["n-1", "p2", "n-2"]);
    expect(mudancas.flatMap((m) => m.tira.map((t) => t.id))).not.toContain(
      "p2",
    );
    // p3 não tem par: vira remoção.
    expect(mudancas.at(-1)).toEqual({
      id: "m3",
      tira: [{ id: "p3", texto: "Três." }],
      poe: [],
      depois_de: null,
    });
  });

  it("travados fora de ordem na resposta voltam à ordem do texto", () => {
    const dois = [par("a", "A.", [1], true), par("b", "B.", [2], true)];
    const { ordem } = mudancasDeTamanho(
      dois,
      [{ travado: "b" }, { travado: "a" }],
      ids(),
    );
    expect(ordem).toEqual(["a", "b"]);
  });
});

describe("mudancasDeAudio", () => {
  it("insere e substitui só não travados", () => {
    const m = mudancasDeAudio(
      atual,
      [
        {
          tipo: "inserir",
          alvo: "p3",
          paragrafos: [{ texto: "Novo.", fontes: [10] }],
        },
        {
          tipo: "substituir",
          alvo: "p2",
          paragrafos: [{ texto: "IA no travado.", fontes: [3] }],
        },
        {
          tipo: "substituir",
          alvo: "p4",
          paragrafos: [{ texto: "Quatro e mais.", fontes: [5, 11] }],
        },
        {
          tipo: "substituir",
          alvo: "p4",
          paragrafos: [{ texto: "De novo.", fontes: [5] }],
        },
        {
          tipo: "inserir",
          alvo: "nao-existe",
          paragrafos: [{ texto: "No fim.", fontes: [12] }],
        },
        {
          tipo: "inserir",
          alvo: null,
          paragrafos: [{ texto: " ", fontes: [12] }],
        },
      ],
      ids(),
    );
    expect(m.map((x) => [x.id, x.tira.map((t) => t.id), x.depois_de])).toEqual([
      ["m1", [], "p3"],
      ["m2", ["p4"], null],
      ["m3", [], "p4"],
    ]);
  });
});

describe("mudancaDeTrecho e posições", () => {
  it("troca só o trecho e trava o parágrafo", () => {
    const [m] = mudancaDeTrecho(
      par("p1", "Ele foi de trem para Minas.", [1]),
      8,
      15,
      "de ônibus",
      ids(),
    );
    expect(m.poe[0]).toEqual(
      par("n-1", "Ele foi de ônibus para Minas.", [1], true),
    );
  });

  it("UTF-16 ↔ pontos de código", () => {
    const t = "Oi 👋 vó";
    expect(paraPontos(t, 6)).toBe(5);
    expect(paraUtf16(t, 5)).toBe(6);
  });
});

describe("comporProposta", () => {
  const { mudancas, ordem } = mudancasDeTamanho(
    atual,
    [
      { texto: "Um longo.", fontes: [1, 2] },
      { travado: "p2" },
      { texto: "Três e quatro.", fontes: [4, 5] },
      { texto: "Novo.", fontes: [9] },
    ],
    ids(),
  );
  const p = proposta({
    mudancas,
    ordem,
    marcacoes: [
      {
        paragrafo_id: "n-2",
        inicio: 0,
        fim: 4,
        trecho: "Três",
        tipo: "fato",
        origem: "verificador",
        motivo: "x",
      },
    ],
  });
  const grifoP2: Marcacao = {
    paragrafo: 2,
    inicio: 0,
    fim: 4,
    trecho: "Dois",
    tipo: "nome",
    origem: "checagem",
    motivo: "y",
  };

  it("aceitar tudo dá a ordem da IA, com o travado idêntico e os grifos no lugar", () => {
    const r = comporProposta(atual, [grifoP2], p, ["m1", "m2", "m3"]);
    expect(r.paragrafos.map((x) => x.id)).toEqual(["n-1", "p2", "n-2", "n-3"]);
    expect(r.paragrafos[1]).toBe(atual[1]);
    expect(r.marcacoes.map((m) => [m.paragrafo, m.trecho])).toEqual([
      [2, "Dois"],
      [3, "Três"],
    ]);
  });

  it("aceite parcial: a recusada fica como estava; inserção sem âncora vai depois do anterior", () => {
    const r = comporProposta(atual, [], p, ["m1", "m3"]);
    expect(r.paragrafos.map((x) => x.id)).toEqual([
      "n-1",
      "p2",
      "p3",
      "p4",
      "n-3",
    ]);
    expect(r.aplicadas).toEqual(["m1", "m3"]);
  });

  it("parágrafo criado depois do pedido fica no lugar dele", () => {
    const depois = [
      ...atual.slice(0, 2),
      par("p-novo", "Escrevi agora.", [3], true),
      ...atual.slice(2),
    ];
    const r = comporProposta(depois, [], p, ["m1", "m2", "m3"]);
    expect(r.paragrafos.map((x) => x.id)).toEqual([
      "n-1",
      "p2",
      "p-novo",
      "n-2",
      "n-3",
    ]);
  });

  it("mudança vencida não entra", () => {
    const mexido = atual.map((x) =>
      x.id === "p1" ? { ...x, texto: "Um, mexido.", editado: true } : x,
    );
    expect(mudancasVencidas(mexido, p)).toEqual(new Set(["m1"]));
    const r = comporProposta(mexido, [], p, ["m1", "m2", "m3"]);
    expect(r.paragrafos.map((x) => x.id)).toEqual(["p1", "p2", "n-2", "n-3"]);
    expect(r.aplicadas).toEqual(["m2", "m3"]);
  });

  it("parágrafo editado e desfeito (texto igual, mas travado) também vence", () => {
    const desfeito = atual.map((x) =>
      x.id === "p1" ? { ...x, editado: true } : x,
    );
    expect(mudancasVencidas(desfeito, p).has("m1")).toBe(true);
  });

  it("revisar trecho pode tirar o próprio travado", () => {
    const m = mudancaDeTrecho(atual[1], 0, 4, "Três", ids());
    const t = proposta({
      tipo: "trecho",
      mudancas: m,
      pedido: { paragrafo: "p2" },
    });
    expect(mudancasVencidas(atual, t).size).toBe(0);
    const r = comporProposta(atual, [], t, ["m1"]);
    expect(r.paragrafos[1]).toEqual(
      par("n-1", "Três, editado à mão.", [3], true),
    );
  });

  it("áudio: inserção depois de um parágrafo substituído vai depois do substituto", () => {
    const m = mudancasDeAudio(
      atual,
      [
        {
          tipo: "substituir",
          alvo: "p3",
          paragrafos: [{ texto: "Três, com mais.", fontes: [4, 10] }],
        },
        {
          tipo: "inserir",
          alvo: "p3",
          paragrafos: [{ texto: "A.", fontes: [11] }],
        },
        {
          tipo: "inserir",
          alvo: "p3",
          paragrafos: [{ texto: "B.", fontes: [12] }],
        },
      ],
      ids(),
    );
    const r = comporProposta(
      atual,
      [],
      proposta({ tipo: "audio", mudancas: m }),
      ["m1", "m2", "m3"],
    );
    expect(r.paragrafos.map((x) => x.texto)).toEqual([
      "Um.",
      "Dois, editado à mão.",
      "Três, com mais.",
      "A.",
      "B.",
      "Quatro.",
    ]);
  });
});

describe("diferencaPorPalavra", () => {
  it("marca o inserido e o removido", () => {
    expect(
      diferencaPorPalavra("Ele foi de trem.", "Ele foi de ônibus."),
    ).toEqual([
      { tipo: "igual", texto: "Ele foi de " },
      { tipo: "removido", texto: "trem" },
      { tipo: "inserido", texto: "ônibus" },
      { tipo: "igual", texto: "." },
    ]);
    expect(diferencaPorPalavra("ainda escuro.", "ainda escuro,")).toEqual([
      { tipo: "igual", texto: "ainda escuro" },
      { tipo: "removido", texto: "." },
      { tipo: "inserido", texto: "," },
    ]);
    expect(diferencaPorPalavra("", "Novo.")).toEqual([
      { tipo: "inserido", texto: "Novo." },
    ]);
    expect(diferencaPorPalavra("Velho.", "")).toEqual([
      { tipo: "removido", texto: "Velho." },
    ]);
  });
});
