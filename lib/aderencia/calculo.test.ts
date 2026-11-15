import { describe, expect, it } from "vitest";
import {
  acessosPorPessoa,
  diaBrasilia,
  funil,
  gravacoesPorSemana,
  linhaDoLivro,
  ordenarPorParado,
  passoDoLivro,
  ultimaAcaoDePessoa,
  type EventoLinha,
  type LivroEntrada,
} from "./calculo";

const AGORA = new Date("2026-11-15T15:00:00.000Z"); // 12 h em Brasília
const dias = (n: number) =>
  new Date(AGORA.getTime() - n * 24 * 3600_000).toISOString();

const ev = (
  acao: string,
  ator_tipo = "responsavel",
  criado_em = AGORA.toISOString(),
  ator_id: string | null = "u1",
): EventoLinha => ({ acao, ator_tipo, criado_em, ator_id, book_id: "b1" });

const livro = (p: Partial<LivroEntrada> = {}): LivroEntrada => ({
  id: "b1",
  autorNome: "Jair",
  criadoEm: dias(30),
  prontas: 0,
  revisadas: 0,
  ...p,
});

describe("diaBrasilia", () => {
  it("2h UTC ainda é o dia anterior em Brasília", () => {
    expect(diaBrasilia("2026-11-15T02:59:00.000Z")).toBe("2026-11-14");
    expect(diaBrasilia("2026-11-15T03:00:00.000Z")).toBe("2026-11-15");
  });
});

describe("passoDoLivro", () => {
  it("sem nome do autor, está no passo 1", () => {
    expect(passoDoLivro(livro({ autorNome: " " }), [])).toEqual({
      feitos: 0,
      atual: 0,
    });
  });
  it("com o nome e sem enquete, está no passo 2", () => {
    expect(passoDoLivro(livro(), [])).toEqual({ feitos: 1, atual: 1 });
  });
  it("pergunta enviada, gravação do autor e áudio subido fecham o passo 3", () => {
    for (const a of ["enviou_pergunta", "gravou", "subiu_audio"])
      expect(passoDoLivro(livro(), [ev("abriu_enquete"), ev(a)]).atual).toBe(3);
  });
  it("não pula passo: história pronta sem enquete continua no passo 2", () => {
    expect(passoDoLivro(livro({ prontas: 1 }), []).atual).toBe(1);
  });
  it("história pronta leva ao passo 5; revisada fecha os 5", () => {
    const base = [ev("abriu_enquete"), ev("enviou_pergunta")];
    expect(passoDoLivro(livro({ prontas: 1 }), base).atual).toBe(4);
    expect(passoDoLivro(livro({ prontas: 1, revisadas: 1 }), base)).toEqual({
      feitos: 5,
      atual: null,
    });
  });
});

describe("gravacoesPorSemana", () => {
  it("separa autor de membros e ignora o que passa da janela", () => {
    const s = gravacoesPorSemana(
      [
        ev("gravou", "autor", dias(1)),
        ev("gravou", "responsavel", dias(2)),
        ev("subiu_audio", "responsavel", dias(8)),
        ev("gravou", "autor", dias(7 * 8 + 1)),
        ev("editou", "responsavel", dias(1)),
      ],
      AGORA,
    );
    expect(s).toHaveLength(8);
    expect(s[0]).toEqual({ autor: 1, membros: 1 });
    expect(s[1]).toEqual({ autor: 0, membros: 1 });
    expect(s.slice(2).every((x) => x.autor === 0 && x.membros === 0)).toBe(
      true,
    );
  });
  it("evento do futuro não entra", () => {
    const futuro = new Date(AGORA.getTime() + 1000).toISOString();
    expect(
      gravacoesPorSemana([ev("gravou", "autor", futuro)], AGORA)[0],
    ).toEqual({
      autor: 0,
      membros: 0,
    });
  });
});

describe("parado", () => {
  it("sistema e admin não contam como ação de pessoa", () => {
    expect(
      ultimaAcaoDePessoa([
        ev("historia_pronta", "sistema"),
        ev("plano_ativado", "admin"),
      ]),
    ).toBeNull();
  });
  it("parado com 7 dias ou mais desde a última ação de pessoa", () => {
    expect(
      linhaDoLivro(livro(), [ev("entrou", "responsavel", dias(6))], AGORA)
        .parado,
    ).toBe(false);
    const l = linhaDoLivro(
      livro(),
      [ev("entrou", "responsavel", dias(7))],
      AGORA,
    );
    expect(l.parado).toBe(true);
    expect(l.paradoHaDias).toBe(7);
  });
  it("sem ação nenhuma, conta desde a criação do livro", () => {
    expect(
      linhaDoLivro(livro({ criadoEm: dias(3) }), [], AGORA).paradoHaDias,
    ).toBe(3);
  });
  it("autorApareceu e autorGravou distinguem abriu de gravou", () => {
    const abriu = linhaDoLivro(
      livro(),
      [ev("entrou", "autor", dias(1), null)],
      AGORA,
    );
    expect(abriu.autorApareceu).toBe(true);
    expect(abriu.autorGravou).toBe(false);
    const gravou = linhaDoLivro(
      livro(),
      [ev("gravou", "autor", dias(1), null)],
      AGORA,
    );
    expect(gravou.autorGravou).toBe(true);
  });
});

describe("funil e ordem", () => {
  it("conta livros por degrau e deixa o publicado em null", () => {
    const livros = [
      livro({ id: "a", prontas: 5 }),
      livro({ id: "b", prontas: 1 }),
      livro({ id: "c" }),
    ];
    const linhas = [
      linhaDoLivro(livros[0], [ev("configurou")], AGORA),
      linhaDoLivro(livros[1], [], AGORA),
      linhaDoLivro(livros[2], [ev("configurou")], AGORA),
    ];
    expect(funil(livros, linhas)).toEqual({
      livros: 3,
      configurou: 2,
      primeiraHistoria: 2,
      cincoHistorias: 1,
      publicado: null,
    });
  });
  it("ordena do mais parado para o menos", () => {
    const a = linhaDoLivro(livro({ id: "a", criadoEm: dias(2) }), [], AGORA);
    const b = linhaDoLivro(livro({ id: "b", criadoEm: dias(9) }), [], AGORA);
    expect(ordenarPorParado([a, b]).map((l) => l.id)).toEqual(["b", "a"]);
  });
});

describe("acessosPorPessoa", () => {
  it("1 linha por pessoa, dias de Brasília dentro de 14 dias, mais recente primeiro", () => {
    const r = acessosPorPessoa(
      [
        ev("entrou", "responsavel", dias(0), "u1"),
        ev("entrou", "responsavel", dias(1), "u1"),
        ev("entrou", "responsavel", dias(20), "u1"),
        ev("entrou", "autor", dias(3), null),
        ev("editou", "responsavel", dias(0), "u1"),
      ],
      AGORA,
    );
    expect(r).toHaveLength(2);
    expect(r[0].papel).toBe("responsavel");
    expect(r[0].dias).toEqual(["2026-11-15", "2026-11-14"]);
    expect(r[0].ultimo).toBe(dias(0));
    expect(r[1]).toMatchObject({
      papel: "autor",
      atorId: null,
      dias: ["2026-11-12"],
    });
  });
  it("acesso antigo aparece como último, mas sem dias na janela", () => {
    const [p] = acessosPorPessoa(
      [ev("entrou", "responsavel", dias(30), "u1")],
      AGORA,
    );
    expect(p.dias).toEqual([]);
    expect(p.ultimo).toBe(dias(30));
  });
});
