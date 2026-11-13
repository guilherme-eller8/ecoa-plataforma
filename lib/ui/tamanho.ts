// Controle de tamanho do texto: 5 posições, de Resumido a Detalhado (PRD, M6).
export const TAMANHOS = [
  "Resumido",
  "Curto",
  "Médio",
  "Longo",
  "Detalhado",
] as const;

export type Tamanho = 1 | 2 | 3 | 4 | 5;

export function rotuloDoTamanho(posicao: number): string {
  const i = Math.min(TAMANHOS.length, Math.max(1, Math.round(posicao))) - 1;
  return TAMANHOS[i];
}

// "1 parágrafo travado", "2 parágrafos travados"; zero não gera aviso.
export function avisoTravados(quantidade: number): string | null {
  if (quantidade <= 0) return null;
  return quantidade === 1
    ? "1 parágrafo editado à mão fica como está"
    : `${quantidade} parágrafos editados à mão ficam como estão`;
}

// Prompt 9: posição do controle (1 a 5) ↔ chave do tamanho no banco e em TAMANHOS_TEXTO.
export const CHAVES_TAMANHO = [
  "resumido",
  "curto",
  "medio",
  "longo",
  "detalhado",
] as const;
export type ChaveTamanho = (typeof CHAVES_TAMANHO)[number];

export function chaveDaPosicao(posicao: number): ChaveTamanho {
  const i = Math.min(5, Math.max(1, Math.round(posicao))) - 1;
  return CHAVES_TAMANHO[i];
}

export function posicaoDaChave(chave: string): number {
  const i = CHAVES_TAMANHO.indexOf(chave as ChaveTamanho);
  return i < 0 ? 3 : i + 1;
}

export function rotuloDaChave(chave: string): string {
  return rotuloDoTamanho(posicaoDaChave(chave));
}
