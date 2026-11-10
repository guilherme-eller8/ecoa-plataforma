// Comprime a foto no navegador antes de subir: JPEG com o lado maior de até 3000 px
// (21 cm a 300 DPI pede 2480 px). No iPhone, isso também converte HEIC em JPEG.
import { FOTO_LADO_MAX_PX, FOTO_QUALIDADE_JPEG } from "@/lib/config";

export type FotoComprimida = { arquivo: Blob; largura: number; altura: number };

export function medidasReduzidas(
  largura: number,
  altura: number,
  max = FOTO_LADO_MAX_PX,
) {
  const escala = Math.min(1, max / Math.max(largura, altura));
  return {
    largura: Math.round(largura * escala),
    altura: Math.round(altura * escala),
  };
}

export async function comprimirFoto(arquivo: File): Promise<FotoComprimida> {
  const bitmap = await createImageBitmap(arquivo, {
    imageOrientation: "from-image",
  });
  const { largura, altura } = medidasReduzidas(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sem canvas");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) =>
    canvas.toBlob(ok, "image/jpeg", FOTO_QUALIDADE_JPEG),
  );
  if (!blob) throw new Error("não comprimiu");
  return { arquivo: blob, largura, altura };
}
