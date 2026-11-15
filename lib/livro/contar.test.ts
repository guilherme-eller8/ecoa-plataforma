// A contagem de páginas compila a capa sem baixar a foto: com foto de capa escolhida, isso
// já derrubou a montagem inteira (Typst: "file not found capa-foto.jpg").
import { describe, expect, it } from "vitest";
import { conteudoDeExemplo } from "@/lib/exemplos/prompt13";
import { contarDoConteudo, previaDaCapa } from "./contar";

const FOTO = {
  caminho: "livros/x/acervo/y.jpg",
  largura: 3000,
  altura: 1500,
  foco_x: 50,
  foco_y: 50,
};

describe("capa com foto escolhida", () => {
  it("conta as páginas e as linhas do título sem o arquivo da foto", () => {
    const c = conteudoDeExemplo();
    c.livro.capa_foto = FOTO;
    const r = contarDoConteudo(c, "");
    expect(r.paginas).toBeGreaterThan(0);
    expect(r.linhasDoTitulo).toBeGreaterThan(0);
  });

  it("a contagem não muda por haver foto na capa", () => {
    const sem = conteudoDeExemplo();
    const com = conteudoDeExemplo();
    com.livro.capa_foto = FOTO;
    expect(contarDoConteudo(com, "").linhasDoTitulo).toBe(
      contarDoConteudo(sem, "").linhasDoTitulo,
    );
  });

  it("a prévia sem miniatura (foto que não baixou) também sai", () => {
    const c = conteudoDeExemplo();
    c.livro.capa_foto = FOTO;
    expect(previaDaCapa(c, 80, null)).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});
