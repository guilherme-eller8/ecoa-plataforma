import "server-only";
// P75: corta a foto pelo recorte salvo (% da foto já na orientação certa) antes de reduzir. O
// mesmo corte serve ao PDF da gráfica, ao Folhear e à amostra. Sem recorte, devolve os bytes.
import sharp from "sharp";
import { FOTO_PDF_MAX_PIXELS } from "@/lib/config";
import { comoErroLivro } from "./erros";
import type { Recorte } from "./recorte";

export async function aplicarRecorte(
  bytes: Buffer,
  recorte: Recorte | null | undefined,
): Promise<Buffer> {
  if (!recorte) return bytes;
  try {
    // Primeiro a orientação do EXIF: a pessoa recortou a foto como a vê na tela.
    const girada = await sharp(bytes, {
      limitInputPixels: FOTO_PDF_MAX_PIXELS,
      failOn: "error",
    })
      .rotate()
      .toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = girada.info;
    const left = Math.min(w - 1, Math.floor((recorte.x / 100) * w));
    const top = Math.min(h - 1, Math.floor((recorte.y / 100) * h));
    const width = Math.max(
      1,
      Math.min(w - left, Math.round((recorte.l / 100) * w)),
    );
    const height = Math.max(
      1,
      Math.min(h - top, Math.round((recorte.a / 100) * h)),
    );
    return await sharp(girada.data)
      .extract({ left, top, width, height })
      .jpeg({ quality: 95 })
      .toBuffer();
  } catch (e) {
    throw comoErroLivro(e, "falhou_foto");
  }
}
