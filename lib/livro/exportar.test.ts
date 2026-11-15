// Integração: os dois PDFs com o Typst, o sharp e o mupdf de verdade, conferidos como no servidor.
import { inflateSync } from "node:zlib";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { conteudoDeExemplo } from "@/lib/exemplos/prompt13";
import { ESPEC_GRAFICA } from "@/lib/config";
import { completarPaginas, lombadaMm } from "./espec";
import { ErroLivro } from "./erros";
import { conferirCaminhos, gerarPdfsDaVersao, prepararFoto } from "./exportar";
import { montarDadosCapa, montarDadosMiolo } from "./montar-dados";
import type { ConteudoDoLivro } from "./montagem";
import { conferirTodosOsQr, rasterizarEConferir } from "./pdf";
import { compilarCapa, compilarMiolo } from "./render";

const LIVRO = "11111111-1111-4111-8111-111111111111";
const foto = (n: number) =>
  `livros/${LIVRO}/acervo/00000000-0000-4000-8000-00000000000${n}.jpg`;

async function jpeg(l: number, a: number, cor = "#c66") {
  const svg = `<svg width="${l}" height="${a}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${cor}"/><circle cx="${l / 2}" cy="${a / 2}" r="${Math.min(l, a) / 4}" fill="#eee"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}
const baixar = async (_b: string, caminho: string) => {
  if (caminho.includes("0001")) return jpeg(2400, 1600);
  if (caminho.includes("0002")) return jpeg(1200, 1800, "#6c6");
  if (caminho.includes("-foto.jpg")) return jpeg(600, 600, "#66c");
  return jpeg(2000, 1500, "#cc6");
};

function livroCompleto(): ConteudoDoLivro {
  const c = conteudoDeExemplo();
  c.historias[0].fotos = [
    { caminho: foto(1), largura: 2400, altura: 1600 },
    { caminho: foto(2), largura: 1200, altura: 1800 },
  ];
  c.livro.capa_foto = {
    caminho: foto(4),
    largura: 2000,
    altura: 1500,
    foco_x: 50,
    foco_y: 50,
  };
  c.mensagens[0].foto = `livros/${LIVRO}/mensagens/${c.mensagens[0].id}-foto.jpg`;
  return c;
}

const abrirPdf = async (pdf: Buffer) => {
  const m = await import("mupdf");
  return { m, doc: new m.PDFDocument(pdf) };
};

/** Operadores de cor no conteúdo das páginas: texto e QR têm de ser K (nenhum RGB). */
function operadoresDeCor(pdf: Buffer): { rgb: number; k: number } {
  const r = { rgb: 0, k: 0 };
  const bruto = pdf.toString("latin1");
  for (const m of bruto.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      const t = inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
      r.rgb += (t.match(/(?:[\d.]+ ){3}(?:rg|RG)\b/g) ?? []).length;
      r.k += (t.match(/0 0 0 1 k\b/g) ?? []).length;
    } catch {
      // stream que não é conteúdo (imagem, fonte)
    }
  }
  return r;
}

describe("PDFs do livro (Typst + sharp + mupdf)", () => {
  it("6 histórias e 2 mensagens: miolo em múltiplo de 4, capa com a lombada daquela contagem", async () => {
    const r = await gerarPdfsDaVersao({
      livro: LIVRO,
      versao: 2,
      conteudo: livroCompleto(),
      data: new Date("2026-11-15T12:00:00Z"),
      baixar,
    });
    expect(r.paginas % 4).toBe(0);
    expect(r.qrConferidos).toBe(7); // 6 histórias + a mensagem com voz; a só escrita sai sem QR
    expect(r.previas).toHaveLength(r.paginas);
    expect(r.lombadaMm).toBe(lombadaMm(r.paginas));
    expect(r.espec.versao).toBe(ESPEC_GRAFICA.versao);

    const { doc } = await abrirPdf(r.miolo);
    expect(doc.countPages()).toBe(r.paginas);
    const capa = await abrirPdf(r.capa);
    const [x0, , x1] = capa.doc.loadPage(0).getBounds();
    // largura da capa aberta com a lombada da contagem real
    expect(((x1 - x0) / 72) * 25.4).toBeCloseTo(
      2 * 15 + 2 * 151 + 2 * 8 + lombadaMm(r.paginas),
      0,
    );
    // o colofão fica na última página, com a versão
    const ultima = doc
      .loadPage(r.paginas - 1)
      .toStructuredText("preserve-whitespace")
      .asText();
    expect(ultima).toContain("Livro feito com a Ecoa Memórias");
    expect(ultima).toContain("versão 2");
  });

  it("Newsreader embutida, TrimBox a 3 mm no miolo e a 15 mm na capa, BleedBox na página inteira", async () => {
    const r = await gerarPdfsDaVersao({
      livro: LIVRO,
      versao: 1,
      conteudo: livroCompleto(),
      data: new Date(),
      baixar,
    });
    for (const [pdf, inset] of [
      [r.miolo, 3],
      [r.capa, 15],
    ] as const) {
      const bruto = pdf.toString("latin1");
      expect(bruto).toMatch(/Newsreader-Regular/);
      expect(bruto).toMatch(/FontFile2/);
      const { doc } = await abrirPdf(pdf);
      for (let i = 0; i < doc.countPages(); i++) {
        const p = doc.loadPage(i).getObject();
        const [w, h] = [
          doc.loadPage(i).getBounds()[2],
          doc.loadPage(i).getBounds()[3],
        ];
        const trim = [0, 1, 2, 3].map((k) =>
          p.get("TrimBox").get(k).asNumber(),
        );
        const mm = (pt: number) => (pt / 72) * 25.4;
        expect(mm(trim[0])).toBeCloseTo(inset, 1);
        expect(mm(trim[1])).toBeCloseTo(inset, 1);
        expect(mm(w - trim[2])).toBeCloseTo(inset, 1);
        expect(mm(h - trim[3])).toBeCloseTo(inset, 1);
        const bleed = [0, 1, 2, 3].map((k) =>
          p.get("BleedBox").get(k).asNumber(),
        );
        expect(bleed[2]).toBeCloseTo(w, 1);
      }
    }
  });

  it("texto e QR em K puro: nenhum operador RGB no conteúdo das páginas (T52)", async () => {
    const r = await gerarPdfsDaVersao({
      livro: LIVRO,
      versao: 1,
      conteudo: conteudoDeExemplo(),
      data: new Date(),
      baixar,
    });
    const cores = operadoresDeCor(r.miolo);
    expect(cores.rgb).toBe(0);
    expect(cores.k).toBeGreaterThan(0);
  });

  it("contagem sem baixar foto dá o mesmo número do PDF final (T20)", async () => {
    const c = livroCompleto();
    const data = new Date();
    const contagem = montarDadosMiolo(c, {
      modo: "contagem",
      versao: null,
      data,
    });
    const n = completarPaginas(compilarMiolo(contagem.dados).paginas);
    const r = await gerarPdfsDaVersao({
      livro: LIVRO,
      versao: 1,
      conteudo: c,
      data,
      baixar,
    });
    expect(r.paginas).toBe(n);
  });

  it("duas mensagens com QR na mesma página: cada código lido na sua URL", async () => {
    const c = conteudoDeExemplo();
    c.historias = c.historias.slice(0, 1);
    c.mensagens = [0, 1].map((i) => ({
      id: `00000000-0000-4000-8000-0000000002${i}0`,
      nome: `Pessoa ${i}`,
      relacao: "neto",
      incluida: true,
      texto: "Uma mensagem curta.",
      foto: null,
      com_audio: true,
      qr: { codigo: `9ABCDE${i + 2}${i + 3}`, ligado: true },
    }));
    const { dados } = montarDadosMiolo(c, {
      modo: "final",
      versao: 1,
      data: new Date(),
    });
    const miolo = compilarMiolo(dados);
    const paginas = miolo.marcas.map((m) => m.pagina);
    expect(new Set(paginas.slice(1)).size).toBe(1); // as duas na mesma página
    const { lidos } = await rasterizarEConferir(miolo.pdf(), miolo.marcas, {
      previa: false,
    });
    const esperados = miolo.marcas.map((m) => m.codigo);
    expect(conferirTodosOsQr(esperados, miolo.marcas, lidos)).toBe(3);
  });

  it("QR estragado de propósito, a mais ou a menos: a versão falha com qr_nao_conferido", async () => {
    const c = conteudoDeExemplo();
    c.historias = c.historias.slice(0, 2);
    c.mensagens = [];
    const { dados } = montarDadosMiolo(c, {
      modo: "final",
      versao: 1,
      data: new Date(),
    });
    // Estraga o QR da 1ª história: inverte metade dos módulos.
    const q = dados.historias[0].qr!;
    q.linhas = q.linhas.map((l, i) =>
      i % 2 === 0 ? [...l].map((b) => (b === "1" ? "0" : "1")).join("") : l,
    );
    const miolo = compilarMiolo(dados);
    const { lidos } = await rasterizarEConferir(miolo.pdf(), miolo.marcas, {
      previa: false,
    });
    const esperados = c.historias.map((h) => h.qr!.codigo);
    expect(() =>
      conferirTodosOsQr(esperados, miolo.marcas, lidos),
    ).toThrowError(new ErroLivro("qr_nao_conferido"));
    // Um código esperado a mais (sem marca no papel) também falha.
    expect(() =>
      conferirTodosOsQr([...esperados, "ZZZZZZZZ"], miolo.marcas, lidos),
    ).toThrowError(new ErroLivro("qr_nao_conferido"));
  });

  it("caminho de foto fora do livro ou do formato do bucket é recusado antes de baixar", () => {
    const c = livroCompleto();
    expect(() => conferirCaminhos(c, LIVRO)).not.toThrow();
    const outro = livroCompleto();
    outro.historias[0].fotos[0].caminho = foto(1).replace(
      LIVRO,
      "22222222-2222-4222-8222-222222222222",
    );
    expect(() => conferirCaminhos(outro, LIVRO)).toThrowError(
      new ErroLivro("falhou_foto"),
    );
    const sujo = livroCompleto();
    sujo.historias[0].fotos[0].caminho = `livros/${LIVRO}/acervo/../../x/y.jpg`;
    expect(() => conferirCaminhos(sujo, LIVRO)).toThrowError(
      new ErroLivro("falhou_foto"),
    );
    const msg = livroCompleto();
    msg.mensagens[0].foto = `livros/${LIVRO}/mensagens/${msg.mensagens[1].id}-foto.jpg`; // de outra mensagem
    expect(() => conferirCaminhos(msg, LIVRO)).toThrowError(
      new ErroLivro("falhou_foto"),
    );
  });

  it("foto: reduz ao tamanho impresso a 300 DPI, nunca aumenta e tira EXIF e GPS", async () => {
    const original = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: "#789" },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "segredo-da-familia" } })
      .toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const caixa = { larguraMm: 113, alturaMm: 85 };
    const out = await prepararFoto(original, caixa, false);
    const meta = await sharp(out).metadata();
    expect(meta.exif).toBeUndefined();
    expect(out.toString("latin1")).not.toContain("segredo-da-familia");
    expect(meta.width).toBeLessThanOrEqual(1335);
    const pequena = await sharp({
      create: { width: 400, height: 300, channels: 3, background: "#789" },
    })
      .jpeg()
      .toBuffer();
    expect(
      (await sharp(await prepararFoto(pequena, caixa, false)).metadata()).width,
    ).toBe(400);
  });

  it("foto de milhões de pixels (bomba) é recusada pelo limite do sharp", async () => {
    const enorme = await sharp({
      create: { width: 8000, height: 8000, channels: 3, background: "#000" },
    })
      .jpeg({ quality: 1 })
      .toBuffer();
    await expect(
      prepararFoto(enorme, { larguraMm: 113, alturaMm: 85 }, false),
    ).rejects.toThrowError(new ErroLivro("falhou_foto"));
  });

  it("erro do Typst vira só o código: o texto da família não vai para o erro nem para o log", () => {
    const segredo = "TEXTO-SECRETO-DA-FAMILIA";
    const c = conteudoDeExemplo({ titulo: segredo });
    c.historias[0].fotos = [{ caminho: foto(1), largura: 100, altura: 100 }];
    const { dados } = montarDadosMiolo(c, {
      modo: "final",
      versao: 1,
      data: new Date(),
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      compilarMiolo(dados); // a foto não está no compilador: o Typst falha
      throw new Error("devia falhar");
    } catch (e) {
      expect(e).toBeInstanceOf(ErroLivro);
      expect((e as ErroLivro).codigo).toBe("falhou_typst");
      expect(String(e)).not.toContain(segredo);
    }
    expect(JSON.stringify(log.mock.calls)).not.toContain(segredo);
    log.mockRestore();
  });

  it("texto da família com sintaxe do Typst sai como texto, nunca como código", async () => {
    const c = conteudoDeExemplo({
      titulo: '#set page(fill: red) *negrito* "aspas"',
      dedicatoria: '#import "/etc/passwd" $x^2$ #panic("x")',
    });
    c.historias[0].paragrafos = ['#panic("x") @ref <rótulo> `bruto`'];
    c.mensagens[0].nome = "#let a = 1";
    const r = await gerarPdfsDaVersao({
      livro: LIVRO,
      versao: 1,
      conteudo: c,
      data: new Date(),
      baixar,
    });
    const { doc } = await abrirPdf(r.miolo);
    const tudo = Array.from({ length: doc.countPages() }, (_, i) =>
      doc.loadPage(i).toStructuredText("preserve-whitespace").asText(),
    )
      .join("\n")
      .replace(/\s+/g, " ");
    expect(tudo).toContain("#set page(fill: red)");
    expect(tudo).toContain("#panic");
    expect(tudo).toContain("#let a = 1");
  });

  it("título da capa: mede as linhas no próprio Typst (3 cabem, 4 não)", () => {
    const medir = (titulo: string) =>
      compilarCapa(
        montarDadosCapa(conteudoDeExemplo({ titulo }), {
          paginas: 80,
          guias: false,
        }).dados,
        null,
      ).linhasDoTitulo;
    expect(medir("Histórias do Vô Jair")).toBe(1);
    expect(medir("Histórias do Vô Jair e da Vó Maria, de Belo Horizonte")).toBe(
      2,
    );
    expect(
      medir(
        "Tudo o que o Vô Jair viveu e contou aos netos nas tardes de domingo na varanda da casa da rua Bahia em Belo Horizonte",
      ),
    ).toBeGreaterThan(3);
  });
});
