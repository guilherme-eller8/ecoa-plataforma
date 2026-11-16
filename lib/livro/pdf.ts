import "server-only";
// Depois do Typst: caixas do PDF (TrimBox/BleedBox, que o Typst não grava), rasterização única
// de cada página e a conferência dos QR (design 5.5). Nenhum texto do livro passa por aqui além
// do próprio PDF.
import sharp from "sharp";
import { CONFERIR_QR_DPI, PREVIA_PAGINA_DPI } from "@/lib/config";
import { ErroLivro, comoErroLivro } from "./erros";
import { lerQr, recorteDaMarca, urlEsperada } from "./conferir-qr";
import { mmParaPt } from "./espec";
import type { MarcaQr } from "./render";

type Mupdf = typeof import("mupdf");

/** Grava TrimBox (o corte, `insetMm` para dentro) e BleedBox (a página inteira) em todas as páginas. */
export async function gravarCaixas(
  pdf: Buffer,
  insetMm: number,
): Promise<Buffer> {
  try {
    const mupdf: Mupdf = await import("mupdf");
    const doc = new mupdf.PDFDocument(pdf);
    const inset = mmParaPt(insetMm);
    for (let i = 0; i < doc.countPages(); i++) {
      const p = doc.loadPage(i);
      const [x0, y0, x1, y1] = p.getBounds();
      p.setPageBox("BleedBox", [0, 0, x1 - x0, y1 - y0]);
      p.setPageBox("TrimBox", [inset, inset, x1 - x0 - inset, y1 - y0 - inset]);
    }
    const saida = Buffer.from(doc.saveToBuffer("compress").asUint8Array());
    doc.destroy?.();
    return saida;
  } catch (e) {
    throw comoErroLivro(e, "falhou_pdf");
  }
}

export type PaginaRasterizada = {
  jpeg: Buffer;
  largura: number;
  altura: number;
};

/**
 * Rasteriza cada página a 150 DPI uma vez só e usa a imagem duas vezes: lê os QR marcados naquela
 * página e gera a prévia JPEG (~100 DPI, sem alpha). Devolve as prévias e os códigos lidos.
 */
export async function rasterizarEConferir(
  pdf: Buffer,
  marcas: MarcaQr[],
  opcoes: { maiuscula?: boolean; previa?: boolean } = {},
): Promise<{ previas: Buffer[]; lidos: Map<string, string | null> }> {
  const mupdf: Mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(pdf, "application/pdf");
  const previas: Buffer[] = [];
  const lidos = new Map<string, string | null>();
  try {
    const k = CONFERIR_QR_DPI / 72;
    for (let i = 0; i < doc.countPages(); i++) {
      const pix = doc
        .loadPage(i)
        .toPixmap(mupdf.Matrix.scale(k, k), mupdf.ColorSpace.DeviceRGB, true);
      const pixels = new Uint8ClampedArray(pix.getPixels());
      const img = { pixels, largura: pix.getWidth(), altura: pix.getHeight() };
      for (const m of marcas.filter((x) => x.pagina === i + 1)) {
        lidos.set(m.codigo, lerQr(img, recorteDaMarca(m, CONFERIR_QR_DPI)));
      }
      if (opcoes.previa !== false) {
        const reduzida = Math.round(
          (img.largura * PREVIA_PAGINA_DPI) / CONFERIR_QR_DPI,
        );
        previas.push(
          await sharp(
            Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength),
            {
              raw: { width: img.largura, height: img.altura, channels: 4 },
            },
          )
            .flatten({ background: "#ffffff" })
            .resize({ width: reduzida })
            .jpeg({ quality: 78 })
            .toBuffer(),
        );
      }
    }
  } finally {
    doc.destroy?.();
  }
  return { previas, lidos };
}

/**
 * Prévia na tela (amostra e Folhear): só as páginas `de`..`ate` (de 1), em JPEG. Cada marca em
 * `cobrir` vira um quadrado tracejado no lugar do QR: o desenho não pode ser lido por uma câmera
 * (o QR daquela história ainda não existe, nasce ao publicar).
 */
export async function rasterizarPaginas(
  pdf: Buffer,
  de: number,
  ate: number,
  dpi: number,
  cobrir: MarcaQr[] = [],
): Promise<Buffer[]> {
  const mupdf: Mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(pdf, "application/pdf");
  const saida: Buffer[] = [];
  try {
    const k = dpi / 72;
    const fim = Math.min(ate, doc.countPages());
    for (let i = Math.max(1, de); i <= fim; i++) {
      const pix = doc
        .loadPage(i - 1)
        .toPixmap(mupdf.Matrix.scale(k, k), mupdf.ColorSpace.DeviceRGB, false);
      const largura = pix.getWidth();
      const altura = pix.getHeight();
      const pixels = pix.getPixels();
      const caixas = cobrir
        .filter((m) => m.pagina === i)
        .map((m) => recorteDaMarca(m, dpi));
      let img = sharp(
        Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength),
        { raw: { width: largura, height: altura, channels: 3 } },
      );
      if (caixas.length) {
        const tracejado = Math.max(2, Math.round(dpi / 50));
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">${caixas
          .map(
            (c) =>
              `<rect x="${c.x + tracejado}" y="${c.y + tracejado}" width="${c.largura - 2 * tracejado}" height="${c.altura - 2 * tracejado}" fill="#f4efe4" stroke="#9a8f7c" stroke-width="${tracejado}" stroke-dasharray="${tracejado * 3} ${tracejado * 2}"/>`,
          )
          .join("")}</svg>`;
        img = img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]);
      }
      saida.push(await img.jpeg({ quality: 80 }).toBuffer());
    }
  } catch (e) {
    throw comoErroLivro(e, "falhou_pdf");
  } finally {
    doc.destroy?.();
  }
  return saida;
}

/**
 * Cada QR esperado lido exatamente na sua URL, nenhum a mais nem a menos (inclusive com duas
 * mensagens na mesma página). Falhou um: a versão falha.
 */
export function conferirTodosOsQr(
  esperados: string[],
  marcas: MarcaQr[],
  lidos: Map<string, string | null>,
  maiuscula?: boolean,
): number {
  const codigosMarcados = marcas.map((m) => m.codigo);
  if (
    new Set(codigosMarcados).size !== codigosMarcados.length ||
    codigosMarcados.length !== esperados.length ||
    !esperados.every((c) => codigosMarcados.includes(c))
  ) {
    throw new ErroLivro("qr_nao_conferido");
  }
  for (const c of esperados) {
    if (lidos.get(c) !== urlEsperada(c, maiuscula))
      throw new ErroLivro("qr_nao_conferido");
  }
  return esperados.length;
}
