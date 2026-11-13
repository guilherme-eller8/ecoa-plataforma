// Regras do pipeline que valem no servidor, no navegador e nos testes (sem dependências).
// Design: docs/designs/pipeline-texto-ao-vivo.md.

export const EVENTO_GRAVACAO = "ecoa/gravacao.recebida";
export const EVENTO_CANAL = "pipeline";

/**
 * Origens que podem virar história direto (P40, P43). O lote de arquivos espera a divisão do
 * prompt 7; a conversa só passa se tiver uma parte só e menos de 29 min (quem decide é o banco).
 */
export const ORIGENS_AVULSAS = [
  "autor",
  "livre",
  "upload",
  "conversa",
] as const;
export const MAX_CONVERSA_CURTA_S = 29 * 60; // espelha privado.max_historia_s() - 60

export function ehAvulsa(
  g: { origem: string; lote_id: string | null; duracao_s?: number | null },
  partesNoLote = 1,
) {
  if (!(ORIGENS_AVULSAS as readonly string[]).includes(g.origem)) return false;
  if (g.origem !== "conversa") return g.lote_id === null;
  return (
    partesNoLote <= 1 &&
    (g.duracao_s == null || g.duracao_s < MAX_CONVERSA_CURTA_S)
  );
}

export function topicoDoLivro(livroId: string) {
  return `livro:${livroId}`;
}

/** Etapa do cartão (lib/ui/etapas.ts) para cada estado da história no banco. */
export const ETAPA_DO_ESTADO = {
  ouvindo: "ouvindo",
  escrevendo: "escrevendo",
  pronta: "revisar",
  falhou: "falhou",
} as const;

export type EstadoHistoria = keyof typeof ETAPA_DO_ESTADO;
export type EtapaPublicada = (typeof ETAPA_DO_ESTADO)[EstadoHistoria];

/** O que o servidor publica no canal do livro. O texto vai inteiro, até onde chegou. */
export type MensagemCanal =
  | { tipo: "etapa"; historia: string; etapa: EtapaPublicada }
  | {
      tipo: "texto";
      historia: string;
      tentativa: number;
      titulo: string | null;
      paragrafos: string[];
    };

/** Motivo de uma gravação não ter virado história (servico_iniciar_historia), em selo curto. */
export const MOTIVOS_ESPERA = {
  divisao: "Guardada · conversa longa",
  longa: "Guardada · conversa longa",
  sem_duracao: "Guardada",
  sem_consentimento: "Confirme o uso da IA",
  cota_diaria: "Vira texto amanhã",
  livro_fechado: "Guardada",
  nao_recebido: "Guardada",
} as const;

/** A mesma espera, numa frase para a home (nada some sem explicação). */
export const FRASES_ESPERA: Record<keyof typeof MOTIVOS_ESPERA, string> = {
  divisao: "Guardada. Conversas longas viram histórias em breve.",
  longa: "Guardada. Conversas longas viram histórias em breve.",
  sem_duracao: "Guardada.",
  sem_consentimento: "Guardada. Confirme o uso da IA para virar texto.",
  cota_diaria: "Guardada. Vira texto amanhã.",
  livro_fechado: "Guardada.",
  nao_recebido: "Guardada.",
};
