// As etapas que o cartão de história mostra ao vivo (PRD, M5).
export const ETAPAS = [
  { id: "enviando", rotulo: "Enviando" },
  { id: "ouvindo", rotulo: "Ouvindo" },
  { id: "escrevendo", rotulo: "Escrevendo" },
  { id: "revisar", rotulo: "Pronta para revisar" },
] as const;

export type Etapa = (typeof ETAPAS)[number]["id"];

export function indiceDaEtapa(etapa: Etapa): number {
  return ETAPAS.findIndex((e) => e.id === etapa);
}

export function rotuloDaEtapa(etapa: Etapa): string {
  return ETAPAS[indiceDaEtapa(etapa)].rotulo;
}

// Uma etapa está concluída quando a atual já passou dela.
export function etapaConcluida(etapa: Etapa, atual: Etapa): boolean {
  return indiceDaEtapa(etapa) < indiceDaEtapa(atual);
}

export function emProcessamento(atual: Etapa): boolean {
  return atual !== "revisar";
}
