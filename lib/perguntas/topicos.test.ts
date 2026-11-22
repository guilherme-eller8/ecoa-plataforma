import { describe, expect, it } from "vitest";
import type { PerguntaDaTela } from "@/lib/livro/tipos";
import { perguntasDoTema, TEMAS } from "./banco";
import { ABERTAS_ATE, topicosDaConversa } from "./topicos";

const doBanco = (bancoId: string, i: number): PerguntaDaTela => ({
  id: `p-${i}`,
  tipo: "pergunta",
  texto: bancoId,
  origem: "banco",
  bancoId,
  causoId: null,
  sugeridoPor: null,
  fotoUrl: null,
  estado: "para_enviar",
  enviadaEm: null,
});

const causo: PerguntaDaTela = {
  ...doBanco("x", 999),
  tipo: "causo",
  origem: "causo",
  bancoId: null,
};

const [primeira, segunda] = TEMAS;

describe("tópicos de Sobre o que vão conversar", () => {
  it("uma fase só: sem tópicos, a lista vai direto", () => {
    const so = perguntasDoTema(primeira.id)
      .slice(0, 6)
      .map((p, i) => doBanco(p.id, i));
    expect(topicosDaConversa(so)).toBeNull();
    expect(topicosDaConversa([])).toBeNull();
  });

  it("agrupa na ordem das fases e põe o que não é do banco por último", () => {
    const lista = [
      causo,
      doBanco(perguntasDoTema(segunda.id)[0].id, 1),
      doBanco(perguntasDoTema(primeira.id)[0].id, 2),
    ];
    const topicos = topicosDaConversa(lista)!;
    expect(topicos.map((t) => t.categoria.id)).toEqual([
      primeira.id,
      segunda.id,
      "outras",
    ]);
    expect(topicos.at(-1)!.itens).toEqual([causo]);
  });

  it(`lista com até ${ABERTAS_ATE} perguntas vem aberta; maior vem toda fechada`, () => {
    const de = (tema: string, n: number, base: number) =>
      perguntasDoTema(tema)
        .slice(0, n)
        .map((p, i) => doBanco(p.id, base + i));
    const curta = [...de(primeira.id, 4, 0), ...de(segunda.id, 4, 100)];
    expect(topicosDaConversa(curta)!.every((t) => t.abertoDeInicio)).toBe(true);
    const longa = [...curta, ...de(primeira.id, 5, 200).slice(4)];
    expect(longa).toHaveLength(ABERTAS_ATE + 1);
    expect(topicosDaConversa(longa)!.some((t) => t.abertoDeInicio)).toBe(false);
  });
});
