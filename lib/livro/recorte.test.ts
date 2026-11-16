// P75: a conta do recorte, a mesma na tela, na contagem e no PDF.
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { conteudoDeExemplo } from "@/lib/exemplos/prompt13";
import { gerarAmostra } from "./amostra";
import { completarPaginas } from "./espec";
import { caixaDaFoto, caixaDaFotoLado, fotoPequenaParaImprimir } from "./fotos";
import { montarDadosMiolo } from "./montar-dados";
import { aplicarRecorte } from "./recortar-foto";
import {
  dimensoesRecortadas,
  estadoDoRecorte,
  moverRecorte,
  recorteDoEstado,
} from "./recorte";
import { compilarMiolo } from "./render";

// A foto do teste real: em pé e bem alta.
const ALTA = { largura: 739, altura: 1600 };

describe("recorte da foto (P75)", () => {
  it("inteira e sem aproximar = sem recorte", () => {
    expect(
      recorteDoEstado(ALTA, { formato: "inteira", zoom: 1, cx: 50, cy: 50 }),
    ).toBeNull();
  });

  it("em pé 4:5 numa foto alta corta em cima e embaixo, centrado", () => {
    const r = recorteDoEstado(ALTA, {
      formato: "em-pe",
      zoom: 1,
      cx: 50,
      cy: 50,
    })!;
    expect(r.l).toBe(100);
    const d = dimensoesRecortadas({ ...ALTA, recorte: r });
    expect(d.largura! / d.altura!).toBeCloseTo(4 / 5, 2);
    expect(r.y).toBeCloseTo((100 - r.a) / 2, 1);
  });

  it("arrastar não sai da foto; ida e volta guarda formato, aproximação e centro", () => {
    const e = { formato: "quadrada" as const, zoom: 2, cx: 50, cy: 50 };
    const longe = moverRecorte(ALTA, e, 0, -500);
    const r = recorteDoEstado(ALTA, longe)!;
    expect(r.y).toBe(0);
    const volta = estadoDoRecorte(ALTA, r);
    expect(volta.formato).toBe("quadrada");
    expect(volta.zoom).toBeCloseTo(2, 1);
    expect(recorteDoEstado(ALTA, volta)).toEqual(r);
  });

  it("a caixa no papel e o DPI usam o tamanho recortado", () => {
    const r = recorteDoEstado(ALTA, {
      formato: "deitada",
      zoom: 1,
      cx: 50,
      cy: 30,
    })!;
    const inteira = caixaDaFoto(ALTA);
    const cortada = caixaDaFoto({ ...ALTA, recorte: r });
    expect(inteira.alturaMm).toBeGreaterThan(inteira.larguraMm); // a faixa estreita
    expect(cortada.larguraMm / cortada.alturaMm).toBeCloseTo(3 / 2, 1);
    // A página inteira usa a caixa maior: a mesma foto fica pequena para imprimir lá.
    expect(caixaDaFotoLado(ALTA).alturaMm).toBeGreaterThan(inteira.alturaMm);
    expect(fotoPequenaParaImprimir({ ...ALTA, ao_lado: true }, true)).toBe(
      true,
    );
  });

  it("o servidor corta os pixels certos", async () => {
    const original = await sharp({
      create: { width: 400, height: 800, channels: 3, background: "#888" },
    })
      .jpeg()
      .toBuffer();
    const cortada = await aplicarRecorte(original, {
      x: 0,
      y: 25,
      l: 100,
      a: 50,
    });
    const m = await sharp(cortada).metadata();
    expect([m.width, m.height]).toEqual([400, 400]);
    expect(await aplicarRecorte(original, null)).toBe(original);
  });
});

describe("foto na página inteira ao lado (P75)", () => {
  it("no livro: a foto sai da história e abre numa página par, com branco antes se preciso", () => {
    const c = conteudoDeExemplo();
    // Sem mensagens: elas abrem na ímpar, e o branco antes delas esconderia a página a mais.
    c.mensagens = [];
    c.historias[0].fotos = [
      {
        caminho: "x",
        largura: 739,
        altura: 1600,
        recorte: null,
        ao_lado: true,
      },
    ];
    const { dados } = montarDadosMiolo(c, {
      modo: "contagem",
      versao: null,
      data: new Date(),
    });
    expect(dados.historias[0].lado).not.toBeNull();
    expect(dados.historias[0].fotos).toEqual([]);

    const sem = structuredClone(c);
    sem.historias[0].fotos = [];
    const base = compilarMiolo(
      montarDadosMiolo(sem, {
        modo: "contagem",
        versao: null,
        data: new Date(),
      }).dados,
    ).paginas;
    const comLado = compilarMiolo(dados).paginas;
    // 1 página da foto, e às vezes 1 branco para a foto cair à esquerda.
    expect(comLado - base).toBeGreaterThanOrEqual(1);
    expect(comLado - base).toBeLessThanOrEqual(2);
    expect(completarPaginas(comLado) % 4).toBe(0);
  });

  it("na amostra: a foto é a 1ª página e a história abre na 2ª", async () => {
    const bytes = await sharp({
      create: { width: 739, height: 1600, channels: 3, background: "#777" },
    })
      .jpeg()
      .toBuffer();
    const r = await gerarAmostra({
      titulo: "Um ano muito abençoado em Belo Horizonte",
      ano: 1980,
      paragrafos: ["Cheguei em Belo Horizonte no início de janeiro de 1980."],
      codigo: "7KQ2M9XA",
      foto: { bytes, largura: 739, altura: 1600, ao_lado: true },
    });
    expect(r.paginas).toBe(2);
    expect(r.marca.pagina).toBe(2); // o QR fica ao lado do título, na página da história
  });
});
