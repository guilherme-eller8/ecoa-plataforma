// Regras do pipeline que valem no servidor, no navegador e nos testes (sem dependências).
// Design: docs/designs/pipeline-texto-ao-vivo.md.

export const EVENTO_GRAVACAO = "ecoa/gravacao.recebida";
export const EVENTO_CANAL = "pipeline";

/** Origens que viram história direto no prompt 6 (P40). Lote e conversa esperam a divisão. */
export const ORIGENS_AVULSAS = ["autor", "livre", "upload"] as const;

export function ehAvulsa(g: { origem: string; lote_id: string | null }) {
  return (
    g.lote_id === null &&
    (ORIGENS_AVULSAS as readonly string[]).includes(g.origem)
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

/** Motivo de uma gravação não ter virado história (servico_iniciar_historia). */
export const MOTIVOS_ESPERA = {
  divisao: "Aguardando divisão",
  longa: "Aguardando divisão",
  sem_duracao: "Aguardando",
  sem_consentimento: "Aguardando sua confirmação",
  cota_diaria: "Aguardando amanhã",
  livro_fechado: "Aguardando",
  nao_recebido: "Aguardando",
} as const;
