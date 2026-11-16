// Geometria das fotos impressas (Q6, Q13). Puro: a mesma caixa serve à contagem de páginas
// (sem baixar a foto), ao PDF e ao alerta de DPI da tela e do editor.
import { ESPEC_GRAFICA, FOTO_DPI_ALVO, LAYOUT_MIOLO } from "@/lib/config";
import { larguraTextoMm } from "./espec";
import { dimensoesRecortadas, type Recorte } from "./recorte";

/** A foto como o banco a guarda; com recorte (P75), as contas usam o tamanho recortado. */
export type Dimensoes = {
  largura: number | null;
  altura: number | null;
  recorte?: Recorte | null;
  /** 1ª foto numa página inteira, ao lado da abertura da história (P75). */
  ao_lado?: boolean;
};

const arred = (n: number) => Math.round(n * 10) / 10;

/** A caixa da foto no papel: largura da mancha, altura pela proporção, sem cortar (4:3 se faltar). */
export function caixaDaFoto(f: Dimensoes): {
  larguraMm: number;
  alturaMm: number;
} {
  const d = dimensoesRecortadas(f);
  const lt = larguraTextoMm();
  const prop =
    d.largura && d.altura && d.largura > 0 && d.altura > 0
      ? d.altura / d.largura
      : 3 / 4;
  const altura = Math.min(LAYOUT_MIOLO.fotoAlturaMaxMm, lt * prop);
  return { larguraMm: arred(altura / prop), alturaMm: arred(altura) };
}

/** Altura útil da página do miolo (entre a cabeça e o pé), em mm. */
export function alturaUtilMm(): number {
  return (
    ESPEC_GRAFICA.miolo.alturaMm -
    LAYOUT_MIOLO.margemCabecaMm -
    LAYOUT_MIOLO.margemPeMm
  );
}

/** Página inteira ao lado (P75): a maior caixa com a proporção da foto dentro da mancha. */
export function caixaDaFotoLado(f: Dimensoes): {
  larguraMm: number;
  alturaMm: number;
} {
  const d = dimensoesRecortadas(f);
  const lt = larguraTextoMm();
  const at = alturaUtilMm();
  const prop =
    d.largura && d.altura && d.largura > 0 && d.altura > 0
      ? d.altura / d.largura
      : 3 / 4;
  const largura = Math.min(lt, at / prop);
  return { larguraMm: arred(largura), alturaMm: arred(largura * prop) };
}

/** A caixa em que esta foto vai impressa: na página inteira ou junto com a história. */
export function caixaImpressa(f: Dimensoes, primeira: boolean) {
  return primeira && f.ao_lado ? caixaDaFotoLado(f) : caixaDaFoto(f);
}

/** DPI da foto no tamanho impresso (a menor das duas direções; igual quando a caixa é proporcional). */
export function dpiDaFoto(
  f: Dimensoes,
  caixa: { larguraMm: number; alturaMm: number } = caixaDaFoto(f),
): number | null {
  const d = dimensoesRecortadas(f);
  if (!d.largura || !d.altura) return null;
  return Math.round(
    Math.min(
      d.largura / (caixa.larguraMm / 25.4),
      d.altura / (caixa.alturaMm / 25.4),
    ),
  );
}

/** Abaixo de 300 DPI no tamanho impresso: alerta amarelo (no editor também). */
export function fotoPequenaParaImprimir(
  f: Dimensoes,
  primeira = false,
): boolean {
  const dpi = dpiDaFoto(f, caixaImpressa(f, primeira));
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
