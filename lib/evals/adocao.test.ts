import { describe, expect, it } from "vitest";
import {
  ativacao,
  ehCriacao,
  horasAtePrimeiraPronta,
  livrosAtivos,
  primeiroPorLivro,
  quemMantem,
  retencaoPorCoorte,
  valorEntregue,
  type EventoDeAdocao,
  type LivroDeAdocao,
} from "./adocao";

const AGORA = new Date("2026-12-31T15:00:00Z");
const diasAtras = (d: number) =>
  new Date(AGORA.getTime() - d * 24 * 3600_000).toISOString();
const ev = (
  livro: string,
  acao: string,
  dias: number,
  ator = "responsavel",
): EventoDeAdocao => ({
  book_id: livro,
  acao,
  ator_tipo: ator,
  criado_em: diasAtras(dias),
});

const livros: LivroDeAdocao[] = Array.from({ length: 6 }, (_, i) => ({
  id: `L${i}`,
  ativadoEm: diasAtras(40),
}));

describe("ehCriacao", () => {
  it("conta criação de quem tem identidade; entrar e família, não", () => {
    expect(ehCriacao(ev("L0", "gravou", 1, "autor"))).toBe(true);
    expect(ehCriacao(ev("L0", "montou_livro", 1, "cofacilitador"))).toBe(true);
    expect(ehCriacao(ev("L0", "entrou", 1))).toBe(false);
    expect(ehCriacao(ev("L0", "gravou", 1, "familia"))).toBe(false);
    expect(ehCriacao(ev("L0", "votou", 1, "familia"))).toBe(false);
  });
});

describe("livrosAtivos", () => {
  it("livros com criação nos últimos 7 dias, sobre os ativados", () => {
    const t = livrosAtivos(
      [...livros, { id: "sem-plano", ativadoEm: null }],
      [
        ev("L0", "gravou", 1),
        ev("L0", "editou", 2), // mesmo livro conta 1 vez
        ev("L1", "historia_revisada", 6),
        ev("L2", "gravou", 8), // fora da semana
        ev("L3", "entrou", 1), // não é criação
        ev("sem-plano", "gravou", 1),
      ],
      AGORA,
    );
    expect(t).toEqual({ n: 2, de: 6, fracao: 2 / 6 });
  });
});

describe("ativacao", () => {
  it("só entram os livros com o prazo de 7 dias vencido", () => {
    const r = ativacao(
      [
        { id: "a", ativadoEm: diasAtras(20) },
        { id: "b", ativadoEm: diasAtras(20) },
        { id: "c", ativadoEm: diasAtras(3) },
      ],
      new Map([
        ["a", diasAtras(15)], // 5 dias depois: ativou
        ["b", diasAtras(5)], // 15 dias depois: não ativou no prazo
        ["c", diasAtras(1)],
      ]),
      AGORA,
    );
    expect(r.taxa).toMatchObject({ n: 1, de: 2 });
    expect(r.emAndamento).toBe(1);
  });
});

describe("retencaoPorCoorte", () => {
  it("semana N conta só livros que já viveram a semana inteira", () => {
    const coortes = retencaoPorCoorte(
      [
        { id: "a", ativadoEm: diasAtras(22) },
        { id: "b", ativadoEm: diasAtras(22) },
        { id: "n", ativadoEm: diasAtras(2) },
      ],
      [
        ev("a", "gravou", 22 - 8), // semana 1 do livro a
        ev("a", "gravou", 22 - 15), // semana 2
        ev("b", "gravou", 22 - 9), // semana 1 do livro b
      ],
      AGORA,
    );
    expect(coortes).toHaveLength(2);
    const [nova, velha] = coortes;
    expect(nova.livros).toBe(1);
    expect(nova.semanas.every((s) => s === null)).toBe(true);
    expect(velha.livros).toBe(2);
    expect(velha.semanas[0]).toMatchObject({ n: 2, de: 2 });
    expect(velha.semanas[1]).toMatchObject({ n: 1, de: 2 });
    expect(velha.semanas[2]).toBeNull(); // semana 3 ainda não terminou
  });
});

describe("horasAtePrimeiraPronta", () => {
  it("mediana só dos livros com história pronta", () => {
    const r = horasAtePrimeiraPronta(
      [
        { id: "a", ativadoEm: diasAtras(10) },
        { id: "b", ativadoEm: diasAtras(10) },
        { id: "c", ativadoEm: diasAtras(10) },
      ],
      new Map([
        ["a", diasAtras(9)], // 24 h
        ["b", diasAtras(8)], // 48 h
      ]),
    );
    expect(r).toEqual({ mediana: 36, n: 2 });
    expect(horasAtePrimeiraPronta([], new Map())).toEqual({
      mediana: null,
      n: 0,
    });
  });
});

describe("quemMantem e valorEntregue", () => {
  const eventos = [
    ev("a", "gravou", 1, "autor"),
    ev("a", "gravou", 2, "autor"),
    ev("a", "editou", 3, "responsavel"),
    ev("a", "gravou", 40, "cofacilitador"), // fora dos 30 dias
    ev("a", "historia_revisada", 3),
    ev("a", "livro_publicado", 1),
    ev("a", "qr_tocou", 1, "familia"),
  ];
  it("ações de criação por papel", () => {
    expect(quemMantem(eventos, AGORA, 30)).toEqual([
      { papel: "responsavel", acoes: 2 },
      { papel: "cofacilitador", acoes: 0 },
      { papel: "autor", acoes: 2 },
    ]);
  });
  it("o que o produto entregou", () => {
    expect(valorEntregue(eventos, AGORA, 30)).toEqual({
      revisadas: 1,
      publicados: 1,
      qrTocados: 1,
      compartilhadas: 0,
    });
  });
});

describe("primeiroPorLivro", () => {
  it("o menor instante de cada livro, ignorando vazios", () => {
    const m = primeiroPorLivro([
      { book_id: "a", em: diasAtras(2) },
      { book_id: "a", em: diasAtras(5) },
      { book_id: "b", em: null },
    ]);
    expect(m.get("a")).toBe(diasAtras(5));
    expect(m.has("b")).toBe(false);
  });
});
