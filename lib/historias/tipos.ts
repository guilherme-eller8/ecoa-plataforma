// O que as telas de histórias recebem do servidor (prompt 6).
import type { Marcacao } from "@/lib/ai/schemas";
import type { EstadoHistoria } from "@/lib/pipeline/regras";

export type HistoriaDaTela = {
  id: string;
  titulo: string | null;
  estado: EstadoHistoria;
  duracaoS: number | null;
  origem: string | null; // origem da 1ª gravação (autor, upload…)
  pergunta: string | null;
  trecho: string | null; // 1º parágrafo da versão da IA, quando pronta
  criadaEm: string;
  vista: boolean;
};

export type HistoriaParaLer = {
  id: string;
  titulo: string | null;
  estado: EstadoHistoria;
  pergunta: string | null;
  paragrafos: string[];
  marcacoes: Marcacao[];
  lacunas: { pergunta: string; motivo: string }[];
  audios: { id: string; url: string | null; duracaoS: number | null }[];
};

export type NomeDaTela = {
  id: string;
  tipo: "pessoa" | "lugar";
  nome: string;
  apelidos: string[];
  estado: "sugerido" | "aceito" | "recusado";
};

/** Situação de um áudio recebido em relação ao pipeline. */
export type SituacaoDoAudio =
  | { tipo: "historia"; historia: string; estado: EstadoHistoria }
  | { tipo: "espera"; rotulo: string; frase: string; confirmar: boolean };

/** Gravação guardada que ainda não virou história (home). */
export type GuardadaDaTela = {
  id: string;
  origem: string;
  titulo: string | null;
  duracaoS: number | null;
  recebidaEm: string;
  frase: string;
  confirmar: boolean;
};
