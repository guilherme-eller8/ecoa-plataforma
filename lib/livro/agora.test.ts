import { describe, expect, it } from "vitest";
import { contarHistorias, oQueFazerAgora } from "./agora";
import type { Passo } from "./configuracao";
import type { PerguntaDaTela } from "./tipos";

const pergunta = (
  id: string,
  estado: PerguntaDaTela["estado"],
): PerguntaDaTela => ({
  id,
  tipo: "pergunta",
  texto: `Pergunta ${id}`,
  origem: "banco",
  bancoId: null,
  causoId: null,
  sugeridoPor: null,
  fotoUrl: null,
  estado,
  enviadaEm: null,
});

const base = {
  podeEscrever: true,
  iaConfirmada: true,
  audios: 0,
  falta: [] as Passo[],
  perguntas: [] as PerguntaDaTela[],
};

describe("oQueFazerAgora", () => {
  it("somente leitura não tem ação", () => {
    expect(oQueFazerAgora({ ...base, podeEscrever: false })).toBeNull();
  });

  it("áudio esperando a confirmação da IA vem antes de tudo", () => {
    expect(
      oQueFazerAgora({
        ...base,
        iaConfirmada: false,
        audios: 2,
        perguntas: [pergunta("a", "para_enviar")],
      }),
    ).toEqual({ tipo: "confirmar_ia" });
  });

  it("sem áudio, a IA não confirmada não trava", () => {
    expect(oQueFazerAgora({ ...base, iaConfirmada: false })?.tipo).toBe(
      "nova_historia",
    );
  });

  it("a próxima pergunta é a 1ª para enviar, na ordem da lista", () => {
    const r = oQueFazerAgora({
      ...base,
      perguntas: [
        pergunta("a", "enviada"),
        pergunta("b", "pulada"),
        pergunta("c", "para_enviar"),
        pergunta("d", "para_enviar"),
      ],
    });
    expect(r).toMatchObject({ tipo: "pergunta", pergunta: { id: "c" } });
  });

  it("sem pergunta e com o passo pendente, pede as primeiras perguntas", () => {
    expect(
      oQueFazerAgora({ ...base, falta: ["perguntas", "fotos"] })?.tipo,
    ).toBe("primeiras_perguntas");
  });

  it("sem nada pendente, é Nova história", () => {
    expect(oQueFazerAgora({ ...base, falta: ["fotos"] })?.tipo).toBe(
      "nova_historia",
    );
  });
});

describe("contarHistorias", () => {
  it("separa prontas, para revisar e em andamento", () => {
    expect(
      contarHistorias([
        { estado: "pronta", revisada: true },
        { estado: "pronta", revisada: false },
        { estado: "pronta", revisada: false },
        { estado: "escrevendo", revisada: false },
        { estado: "separar", revisada: false },
        { estado: "falhou", revisada: false },
      ]),
    ).toEqual({ prontas: 1, paraRevisar: 2, andando: 2 });
  });
});
