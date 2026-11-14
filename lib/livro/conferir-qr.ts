import "server-only";
// Conferência antes do download (seção 5.3): rasteriza o PDF de verdade e lê o QR por software.
import jsQR from "jsqr";

export type Conferencia = { ok: boolean; paginas: number; lido: string | null };

export async function conferirQr(
  pdf: Buffer,
  urlEsperada: string,
  dpi = 150,
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
    const lido = jsQR(
      new Uint8ClampedArray(pix.getPixels()),
      pix.getWidth(),
      pix.getHeight(),
    );
    return {
      ok: paginas === 1 && lido?.data === urlEsperada,
      paginas,
      lido: lido?.data ?? null,
    };
  } finally {
    doc.destroy?.();
  }
}
