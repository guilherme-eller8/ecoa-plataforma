// Regras do pipeline que valem no servidor, no navegador e nos testes (sem dependências).
// Design: docs/designs/pipeline-texto-ao-vivo.md.

export const EVENTO_GRAVACAO = "ecoa/gravacao.recebida";
export const EVENTO_CANAL = "pipeline";

export const EVENTO_HISTORIA_CONFIRMADA = "ecoa/historia.confirmada";

/**
 * Prompt 7: toda gravação recebida vai para o pipeline; quem decide se ela espera (lote
 * incompleto, mais de 2 h, sem consentimento) é o banco. A chave junta as partes de um lote,
 * para o Inngest processar uma de cada vez.
 */
export function chaveDoEvento(g: { id: string; lote_id: string | null }) {
  return g.lote_id ?? g.id;
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
  dividindo: "separando", // prompt 7: a IA propõe as histórias
  separar: "conferir", // prompt 7: espera a pessoa conferir
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
  lote_incompleto: "Esperando os outros áudios",
  longa: "Passa de 2 horas",
  sem_duracao: "Guardada",
  sem_consentimento: "Confirme o uso da IA",
  cota_diaria: "Vira texto amanhã",
  livro_fechado: "Guardada",
  descartada: "Fora das histórias",
  nao_recebido: "Guardada",
} as const;

export type MotivoEspera = keyof typeof MOTIVOS_ESPERA;

/** A mesma espera, numa frase para a home (nada some sem explicação). */
export const FRASES_ESPERA: Record<MotivoEspera, string> = {
  lote_incompleto: "Guardada. Esperando os outros áudios do envio.",
  longa:
    "Este áudio passa de 2 horas. Divida em partes de até 2 horas e envie de novo.",
  sem_duracao: "Guardada.",
  sem_consentimento: "Guardada. Confirme o uso da IA para virar texto.",
  cota_diaria: "Guardada. Vira texto amanhã.",
  livro_fechado: "Guardada.",
  descartada: "Ficou fora das histórias. O áudio continua guardado.",
  nao_recebido: "Guardada.",
};
