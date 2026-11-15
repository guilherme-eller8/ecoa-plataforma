import "server-only";
// Conferência do QR (prompt 10, generalizada no 13): lê o QR por software, no quadrado onde o
// template o pôs. Recebe a imagem da página e o retângulo; serve à amostra e ao livro inteiro.
import jsQR from "jsqr";
import { CONFERIR_QR_DPI } from "@/lib/config";
import { urlDoQr } from "@/lib/qr/codigo";
import type { MarcaQr } from "./render";

export type Imagem = {
  /** RGBA, 4 bytes por pixel. */
  pixels: Uint8ClampedArray;
  largura: number;
  altura: number;
};
export type Recorte = { x: number; y: number; largura: number; altura: number };

/** O quadrado da marca (pt, a partir do canto da página) em pixels da imagem rasterizada. */
export function recorteDaMarca(marca: MarcaQr, dpi = CONFERIR_QR_DPI): Recorte {
  const k = dpi / 72;
  return {
    x: Math.floor(marca.x * k),
    y: Math.floor(marca.y * k),
    largura: Math.ceil(marca.lado * k),
    altura: Math.ceil(marca.lado * k),
  };
}

/** Lê o QR dentro do retângulo (ou da imagem inteira, sem retângulo). null = não leu. */
export function lerQr(img: Imagem, recorte?: Recorte): string | null {
  if (!recorte) return jsQR(img.pixels, img.largura, img.altura)?.data ?? null;
  const x0 = Math.max(0, recorte.x);
  const y0 = Math.max(0, recorte.y);
  const w = Math.min(recorte.largura, img.largura - x0);
  const h = Math.min(recorte.altura, img.altura - y0);
  if (w < 20 || h < 20) return null;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const de = ((y0 + y) * img.largura + x0) * 4;
    out.set(img.pixels.subarray(de, de + w * 4), y * w * 4);
  }
  return jsQR(out, w, h)?.data ?? null;
}

export type Conferencia = { ok: boolean; paginas: number; lido: string | null };

/**
 * Amostra: 1 página, 1 QR. Se a marca não vier, lê a página inteira (como no prompt 10).
 */
export async function conferirQr(
  pdf: Buffer,
  urlEsperada: string,
  marca?: MarcaQr,
  dpi = CONFERIR_QR_DPI,
): Promise<Conferencia> {
  const mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(pdf, "application/pdf");
  try {
    const paginas = doc.countPages();
    const pagina = doc.loadPage(0);
    const pix = pagina.toPixmap(
      mupdf.Matrix.scale(dpi / 72, dpi / 72),
      mupdf.ColorSpace.DeviceRGB,
      true,
    );
    const lido = lerQr(
      {
        pixels: new Uint8ClampedArray(pix.getPixels()),
        largura: pix.getWidth(),
        altura: pix.getHeight(),
      },
      marca ? recorteDaMarca(marca, dpi) : undefined,
    );
    return { ok: paginas === 1 && lido === urlEsperada, paginas, lido };
  } finally {
    doc.destroy?.();
  }
}

/** A URL que cada código esperado deve ter no papel. */
export const urlEsperada = (codigo: string, maiuscula?: boolean) =>
  urlDoQr(codigo, maiuscula);
