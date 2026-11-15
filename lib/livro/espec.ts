// Geometria do livro a partir de ESPEC_GRAFICA e LAYOUT_MIOLO (lib/config.ts): nenhum número
// de gráfica fora de lá. Puro (sem servidor), porque a tela também usa (valor extra, lombada).
import {
  ESPEC_GRAFICA,
  LAYOUT_MIOLO,
  PAGINAS_INCLUSAS,
  VALOR_PAGINA_EXTRA,
} from "@/lib/config";

const arred = (n: number) => Math.round(n * 100) / 100;

/** Completa com páginas em branco até o múltiplo da gráfica (4). */
export function completarPaginas(paginas: number): number {
  const m = ESPEC_GRAFICA.miolo.multiploPaginas;
  return Math.ceil(Math.max(paginas, 1) / m) * m;
}

/** Páginas além das que o plano cobre (Q16: só informa, nunca limita). */
export function paginasExtras(paginas: number): number {
  return Math.max(0, paginas - PAGINAS_INCLUSAS);
}

/** "cerca de R$ X" quando o valor da página existe; senão null (a tela diz "sai no orçamento"). */
export function valorDasPaginasExtras(paginas: number): number | null {
  if (VALOR_PAGINA_EXTRA == null) return null;
  return paginasExtras(paginas) * VALOR_PAGINA_EXTRA;
}

/** Lombada: folhas × espessura + 2 × papelão + folga (80 páginas ≈ 9 mm). */
export function lombadaMm(paginas: number): number {
  const { miolo, capa } = ESPEC_GRAFICA;
  const folhas = completarPaginas(paginas) / 2;
  return arred(
    folhas * miolo.espessuraFolhaMm + 2 * capa.papelaoMm + capa.folgaLombadaMm,
  );
}

/** A página do miolo com a sangria, em mm e em pt. */
export function paginaDoMiolo() {
  const { larguraMm, alturaMm, sangriaMm } = ESPEC_GRAFICA.miolo;
  return {
    larguraMm: larguraMm + 2 * sangriaMm,
    alturaMm: alturaMm + 2 * sangriaMm,
    sangriaMm,
    corteLarguraMm: larguraMm,
    corteAlturaMm: alturaMm,
  };
}

/** Largura da mancha de texto do miolo. */
export function larguraTextoMm(): number {
  return (
    ESPEC_GRAFICA.miolo.larguraMm -
    LAYOUT_MIOLO.margemInternaMm -
    LAYOUT_MIOLO.margemExternaMm
  );
}

export type CapaAberta = {
  larguraMm: number;
  alturaMm: number;
  lombadaMm: number;
  papelaoLarguraMm: number; // cada papelão (frente e verso)
  papelaoAlturaMm: number;
  dobraMm: number;
  /** Onde começa cada zona, a partir da borda esquerda do papel. */
  versoX: number;
  lombadaX: number;
  frenteX: number;
  /** O corte final: a área sem a dobra. */
  corte: { x: number; y: number; larguraMm: number; alturaMm: number };
};

/**
 * Capa aberta de capa dura: dobra | papelão do verso | canal | lombada | canal | papelão da frente |
 * dobra. Altura = 2 × dobra + papelão (miolo + 2 projeções). Largura ≈ 357 mm com 80 páginas.
 */
export function capaAberta(paginas: number): CapaAberta {
  const { miolo, capa } = ESPEC_GRAFICA;
  const lombada = lombadaMm(paginas);
  const papelaoLarg = miolo.larguraMm + capa.projecaoMm;
  const papelaoAlt = miolo.alturaMm + 2 * capa.projecaoMm;
  const versoX = capa.dobraMm;
  const lombadaX = versoX + papelaoLarg + capa.canalMm;
  const frenteX = lombadaX + lombada + capa.canalMm;
  const largura = frenteX + papelaoLarg + capa.dobraMm;
  const altura = 2 * capa.dobraMm + papelaoAlt;
  return {
    larguraMm: arred(largura),
    alturaMm: arred(altura),
    lombadaMm: lombada,
    papelaoLarguraMm: papelaoLarg,
    papelaoAlturaMm: papelaoAlt,
    dobraMm: capa.dobraMm,
    versoX,
    lombadaX: arred(lombadaX),
    frenteX: arred(frenteX),
    corte: {
      x: capa.dobraMm,
      y: capa.dobraMm,
      larguraMm: arred(largura - 2 * capa.dobraMm),
      alturaMm: arred(altura - 2 * capa.dobraMm),
    },
  };
}

/** A especificação como foi usada na publicação: gravada em book_exports.espec (Q3). */
export function especUsada() {
  return {
    versao: ESPEC_GRAFICA.versao,
    confirmada: ESPEC_GRAFICA.confirmada,
    miolo: { ...ESPEC_GRAFICA.miolo },
    capa: { ...ESPEC_GRAFICA.capa },
    cor: ESPEC_GRAFICA.cor,
    layout: { ...LAYOUT_MIOLO },
  };
}

export const mmParaPt = (mm: number) => (mm * 72) / 25.4;
