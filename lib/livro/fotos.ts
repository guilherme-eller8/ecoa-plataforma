// Geometria das fotos impressas (Q6, Q13). Puro: a mesma caixa serve à contagem de páginas
// (sem baixar a foto), ao PDF e ao alerta de DPI da tela e do editor.
import { FOTO_DPI_ALVO, LAYOUT_MIOLO } from "@/lib/config";
import { larguraTextoMm } from "./espec";

export type Dimensoes = { largura: number | null; altura: number | null };

const arred = (n: number) => Math.round(n * 10) / 10;

/** A caixa da foto no papel: largura da mancha, altura pela proporção, sem cortar (4:3 se faltar). */
export function caixaDaFoto(f: Dimensoes): {
  larguraMm: number;
  alturaMm: number;
} {
  const lt = larguraTextoMm();
  const prop =
    f.largura && f.altura && f.largura > 0 && f.altura > 0
      ? f.altura / f.largura
      : 3 / 4;
  const altura = Math.min(LAYOUT_MIOLO.fotoAlturaMaxMm, lt * prop);
  return { larguraMm: arred(altura / prop), alturaMm: arred(altura) };
}

/** DPI da foto no tamanho impresso (a menor das duas direções; igual quando a caixa é proporcional). */
export function dpiDaFoto(
  f: Dimensoes,
  caixa: { larguraMm: number; alturaMm: number } = caixaDaFoto(f),
): number | null {
  if (!f.largura || !f.altura) return null;
  return Math.round(
    Math.min(
      f.largura / (caixa.larguraMm / 25.4),
      f.altura / (caixa.alturaMm / 25.4),
    ),
  );
}

/** Abaixo de 300 DPI no tamanho impresso: alerta amarelo (no editor também). */
export function fotoPequenaParaImprimir(f: Dimensoes): boolean {
  const dpi = dpiDaFoto(f);
  return dpi != null && dpi < FOTO_DPI_ALVO;
}

/** O tamanho em pixels a que o PDF reduz a foto: o impresso a 300 DPI, nunca maior que o original. */
export function pixelsDoPdf(
  f: Dimensoes,
  caixa: { larguraMm: number; alturaMm: number },
): { largura: number; altura: number } | null {
  if (!f.largura || !f.altura) return null;
  const l = Math.round((caixa.larguraMm / 25.4) * FOTO_DPI_ALVO);
  const escala = Math.min(1, l / f.largura);
  return {
    largura: Math.max(1, Math.round(f.largura * escala)),
    altura: Math.max(1, Math.round(f.altura * escala)),
  };
}
