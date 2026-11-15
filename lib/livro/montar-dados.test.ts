import { describe, expect, it } from "vitest";
import { conteudoDeExemplo } from "@/lib/exemplos/prompt13";
import { montarDadosCapa, montarDadosMiolo } from "./montar-dados";

const data = new Date("2026-11-15T15:00:00Z");
const base = { modo: "final", versao: 2, data } as const;

describe("JSON dos templates a partir do conteúdo do banco", () => {
  it("só entra o que está incluído, na ordem do banco, e o QR só se toca", () => {
    const c = conteudoDeExemplo();
    c.historias[1].incluida = false;
    c.historias[2].qr = { codigo: "7KQ2M9XC", ligado: false }; // desligado pelo responsável
    c.mensagens[0].incluida = false;
    const { dados } = montarDadosMiolo(c, base);
    expect(dados.historias.map((h) => h.titulo)).toEqual([
      "O trem para Guarapari",
      "Como conheci a Maria",
      "O primeiro emprego",
      "O dia em que choveu pedra",
      "Natal de 1974",
    ]);
    expect(
      dados.historias.find((h) => h.titulo === "Como conheci a Maria")?.qr,
    ).toBeNull();
    expect(dados.historias[0].qr?.codigo).toBe("7KQ2M9XA");
    expect(dados.mensagens.map((m) => m.nome)).toEqual(["Tia Lúcia"]);
    expect(dados.mensagens[0].qr).toBeNull(); // só escrita: sai sem QR
  });

  it("a foto entra por nome local, nunca pelo caminho do Storage", () => {
    const c = conteudoDeExemplo();
    const caminho =
      "livros/11111111-1111-4111-8111-111111111111/acervo/00000000-0000-4000-8000-000000000001.jpg";
    c.historias[0].fotos = [{ caminho, largura: 2400, altura: 1600 }];
    c.mensagens[0].foto = "livros/x/mensagens/y-foto.jpg";
    const { dados, fotos } = montarDadosMiolo(c, base);
    expect(JSON.stringify(dados)).not.toContain("livros/");
    expect(dados.historias[0].fotos[0].arquivo).toBe("foto-h1-1.jpg");
    expect(fotos.map((f) => [f.arquivo, f.bucket])).toEqual([
      ["foto-h1-1.jpg", "acervo"],
      ["foto-m1.jpg", "mensagens"],
    ]);
    expect(fotos[0].caminho).toBe(caminho); // o servidor baixa por aqui
    expect(dados.mensagens[0].foto).toMatchObject({
      larguraMm: 36,
      alturaMm: 36,
    });
  });

  it("o texto da família segue como string: não vira código", () => {
    const c = conteudoDeExemplo({ titulo: "#panic() *x*" });
    c.historias[0].paragrafos = ['#import "/x"'];
    c.mensagens[0].texto = "linha 1\n\nlinha 2";
    const { dados } = montarDadosMiolo(c, base);
    expect(dados.livro.titulo).toBe("#panic() *x*");
    expect(dados.historias[0].paragrafos).toEqual(['#import "/x"']);
    expect(dados.mensagens[0].paragrafos).toEqual(["linha 1", "linha 2"]);
  });

  it("colofão com a data por extenso e a versão; geometria do config", () => {
    const { dados } = montarDadosMiolo(conteudoDeExemplo(), base);
    expect(dados.colofao.linha).toBe("15 de novembro de 2026 · versão 2");
    expect(dados.g).toMatchObject({
      paginaL: 154,
      paginaA: 216,
      sangria: 3,
      interna: 20,
      externa: 15,
      texto: 113,
    });
  });

  it("capa: a lombada e as zonas vêm da contagem de páginas", () => {
    const { dados } = montarDadosCapa(conteudoDeExemplo(), {
      paginas: 80,
      guias: false,
    });
    expect(dados).toMatchObject({ w: 357, h: 246, lombada: 9, versoX: 15 });
    expect(dados.cor.cmyk).toHaveLength(4);
    const maior = montarDadosCapa(conteudoDeExemplo(), {
      paginas: 120,
      guias: true,
    }).dados;
    expect(maior.lombada).toBeGreaterThan(dados.lombada);
    expect(maior.guias).toBe(true);
  });
});
