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
