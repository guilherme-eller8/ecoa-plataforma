// Recorte da foto da história (P75). Puro: a tela, a contagem de páginas e o PDF usam a mesma
// conta. O recorte é um retângulo em % da foto original (já na orientação certa): x e y são o
// canto superior esquerdo, l e a a largura e a altura. null = a foto inteira.
import { z } from "zod";

export const Recorte = z.object({
  x: z.number().min(0).max(95),
  y: z.number().min(0).max(95),
  l: z.number().min(5).max(100),
  a: z.number().min(5).max(100),
});
export type Recorte = z.infer<typeof Recorte>;

export type Formato = "inteira" | "quadrada" | "em-pe" | "deitada";

/** Largura sobre altura de cada formato; "inteira" segue a foto. */
export const PROPORCAO_DO_FORMATO: Record<Formato, number | null> = {
  inteira: null,
  quadrada: 1,
  "em-pe": 4 / 5,
  deitada: 3 / 2,
};

export const APROXIMAR_MAX = 3;

/** O que a tela guarda: formato, aproximação (1 a 3) e o centro do recorte (% da foto). */
export type EstadoDoRecorte = {
  formato: Formato;
  zoom: number;
  cx: number;
  cy: number;
};

export const ESTADO_INICIAL: EstadoDoRecorte = {
  formato: "inteira",
  zoom: 1,
  cx: 50,
  cy: 50,
};

const arred = (n: number) => Math.round(n * 100) / 100;
const entre = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function proporcaoDaFoto(f: { largura: number | null; altura: number | null }) {
  return f.largura && f.altura && f.largura > 0 && f.altura > 0
    ? f.largura / f.altura
    : 4 / 3;
}

/** Tamanho do recorte em % da foto, antes de posicionar. */
function tamanho(
  f: { largura: number | null; altura: number | null },
  e: Pick<EstadoDoRecorte, "formato" | "zoom">,
) {
  const foto = proporcaoDaFoto(f);
  const quadro = PROPORCAO_DO_FORMATO[e.formato] ?? foto;
  const zoom = entre(e.zoom, 1, APROXIMAR_MAX);
  // O maior retângulo com a proporção do quadro que cabe na foto, dividido pela aproximação.
  const l = (foto > quadro ? (quadro / foto) * 100 : 100) / zoom;
  const a = (foto > quadro ? 100 : (foto / quadro) * 100) / zoom;
  return { l: Math.max(5, l), a: Math.max(5, a) };
}

/** Do estado da tela para o recorte salvo. Foto inteira sem aproximar = null. */
export function recorteDoEstado(
  f: { largura: number | null; altura: number | null },
  e: EstadoDoRecorte,
): Recorte | null {
  const { l, a } = tamanho(f, e);
  if (l >= 99.99 && a >= 99.99) return null;
  return {
    x: arred(entre(e.cx - l / 2, 0, 100 - l)),
    y: arred(entre(e.cy - a / 2, 0, 100 - a)),
    l: arred(l),
    a: arred(a),
  };
}

/** Do recorte salvo de volta para a tela: o formato mais próximo, a aproximação e o centro. */
export function estadoDoRecorte(
  f: { largura: number | null; altura: number | null },
  r: Recorte | null,
): EstadoDoRecorte {
  if (!r) return ESTADO_INICIAL;
  const foto = proporcaoDaFoto(f);
  const visto = (r.l / r.a) * foto;
  const formatos = Object.keys(PROPORCAO_DO_FORMATO) as Formato[];
  const formato =
    formatos
      .map((k) => ({
        k,
        erro: Math.abs((PROPORCAO_DO_FORMATO[k] ?? foto) / visto - 1),
      }))
      .sort((p, q) => p.erro - q.erro)[0]?.k ?? "inteira";
  const base = tamanho(f, { formato, zoom: 1 });
  return {
    formato,
    zoom: arred(entre(base.l / r.l, 1, APROXIMAR_MAX)),
    cx: arred(r.x + r.l / 2),
    cy: arred(r.y + r.a / 2),
  };
}

/** Move o centro do recorte, sem sair da foto. dx e dy em % da foto. */
export function moverRecorte(
  f: { largura: number | null; altura: number | null },
  e: EstadoDoRecorte,
  dx: number,
  dy: number,
): EstadoDoRecorte {
  const { l, a } = tamanho(f, e);
  return {
    ...e,
    cx: arred(entre(e.cx + dx, l / 2, 100 - l / 2)),
    cy: arred(entre(e.cy + dy, a / 2, 100 - a / 2)),
  };
}

/** A foto depois do recorte, em pixels (para a caixa no papel e o alerta de DPI). */
export function dimensoesRecortadas(f: {
  largura: number | null;
  altura: number | null;
  recorte?: Recorte | null;
}): { largura: number | null; altura: number | null } {
  if (!f.recorte || !f.largura || !f.altura)
    return { largura: f.largura, altura: f.altura };
  return {
    largura: Math.max(1, Math.round((f.largura * f.recorte.l) / 100)),
    altura: Math.max(1, Math.round((f.altura * f.recorte.a) / 100)),
  };
}
