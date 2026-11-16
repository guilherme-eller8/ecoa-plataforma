import { describe, expect, it } from "vitest";
import { conteudoDeExemplo } from "@/lib/exemplos/prompt13";
import { codigoValido } from "@/lib/qr/codigo";
import { LAYOUT_MIOLO } from "@/lib/config";
import { mmParaPt, paginaDoMiolo } from "./espec";
import { dadosDoFolheio, fotosDoFolheio, QR_PROVISORIO } from "./folhear-dados";
import { compilarMiolo } from "./render";
import { montarDadosMiolo } from "./montar-dados";

const data = new Date("2026-11-16T15:00:00Z");

describe("Folhear antes de publicar (P72)", () => {
  it("QR de verdade onde já existe; provisório só onde vai sair com QR ao publicar", () => {
    const c = conteudoDeExemplo();
    c.historias[0].qr = { codigo: "7KQ2M9XA", ligado: true };
    c.historias[1].qr = null;
    c.historias[1].voz = true; // vai ganhar QR ao publicar
    c.historias[2].qr = null;
    c.historias[2].voz = false; // sem voz que o QR toque: sai sem QR
    c.historias[3].qr = { codigo: "7KQ2M9XC", ligado: false }; // desligado: sai sem QR
    const f = dadosDoFolheio(c, data);
    const porTitulo = new Map(
      f.dados.historias.map((h) => [h.titulo, h.qr?.codigo ?? null]),
    );
    expect(porTitulo.get(c.historias[0].titulo!)).toBe("7KQ2M9XA");
    expect(porTitulo.get(c.historias[1].titulo!)).toBe(QR_PROVISORIO);
    expect(porTitulo.get(c.historias[2].titulo!)).toBeNull();
    expect(porTitulo.get(c.historias[3].titulo!)).toBeNull();
    expect(f.provisorios).toBeGreaterThanOrEqual(1);
  });

  it("o resto do JSON é o mesmo do PDF final (T20), menos o colofão sem número de versão", () => {
    const c = conteudoDeExemplo();
    for (const h of c.historias) h.voz = false;
    for (const m of c.mensagens) m.com_audio = false;
    const f = dadosDoFolheio(c, data);
    const final = montarDadosMiolo(c, { modo: "final", versao: null, data });
    expect({ ...f.dados, colofao: null }).toEqual({
      ...final.dados,
      colofao: null,
    });
    expect(f.fotos).toEqual(final.fotos);
    expect(f.dados.colofao.linha).toMatch(/prévia$/);
    expect(f.provisorios).toBe(0);
  });

  it("o código provisório tem o formato de um código, para o QR ter o tamanho certo", () => {
    expect(codigoValido(QR_PROVISORIO)).toBe(true);
  });
});

describe("tocar na foto no Folhear (P76)", () => {
  const caminho = (n: number) =>
    `livros/11111111-1111-4111-8111-111111111111/acervo/00000000-0000-4000-8000-00000000000${n}.jpg`;

  it("cada foto de história do miolo tem dono: história, foto e se é a 1ª", () => {
    const c = conteudoDeExemplo();
    c.historias[0].fotos = [
      { caminho: caminho(1), largura: 800, altura: 600 },
      { caminho: caminho(2), largura: 600, altura: 800 },
    ];
    const mapa = fotosDoFolheio(c);
    const doMiolo = dadosDoFolheio(c, data).fotos.filter((f) =>
      f.arquivo.startsWith("foto-h"),
    );
    expect(doMiolo.length).toBeGreaterThan(0);
    for (const f of doMiolo) expect(mapa.has(f.arquivo)).toBe(true);
    const [a, b] = doMiolo.map((f) => mapa.get(f.arquivo)!);
    expect(a).toEqual({
      historiaId: c.historias[0].id,
      fotoId: "00000000-0000-4000-8000-000000000001",
      primeira: true,
    });
    expect(b.primeira).toBe(false);
  });

  it("a marca do Typst cai na foto centralizada, não na margem do texto", () => {
    const c = conteudoDeExemplo();
    c.historias[0].fotos = [
      { caminho: caminho(1), largura: 739, altura: 1600 },
    ];
    const f = dadosDoFolheio(c, data);
    const m = compilarMiolo({ ...f.dados, modo: "contagem" })
      .fotos()
      .find((x) => x.arquivo === "foto-h1-1.jpg")!;
    const margem = mmParaPt(
      paginaDoMiolo().sangriaMm + LAYOUT_MIOLO.margemExternaMm,
    );
    // Foto estreita: começa bem depois da margem, porque está centralizada.
    expect(m.x).toBeGreaterThan(margem + mmParaPt(10));
    expect(m.l).toBeCloseTo(
      mmParaPt(f.dados.historias[0].fotos[0].larguraMm),
      0,
    );
  });
});
