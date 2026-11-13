// O que as telas de histórias recebem do servidor (prompt 6).
import type { Marcacao } from "@/lib/ai/schemas";
import type { TextoDaHistoria } from "@/lib/editor/conteudo";
import type { SegmentoDaTela } from "@/lib/editor/ouvir";
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
  // Prompt 7
  gravacoes: number; // gravações da história (o contêiner de um lote tem várias)
  propostas: number | null; // em "separar": quantas histórias a IA propôs
  dividida: boolean; // já passou por uma divisão confirmada (o canal não volta a "conferir")
  revisada: boolean; // prompt 8: a família marcou como pronta
};

export type HistoriaParaLer = {
  id: string;
  titulo: string | null;
  estado: EstadoHistoria;
  pergunta: string | null;
  paragrafos: string[];
  marcacoes: Marcacao[];
  lacunas: { pergunta: string; motivo: string }[];
  audios: {
    id: string;
    url: string | null;
    duracaoS: number | null;
    inicioS?: number; // prompt 7: a história usa só um pedaço da gravação
    fimS?: number;
  }[];
  sugestao: { id: string; texto: string } | null; // pergunta pendente que ela parece responder
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

/** Prompt 7: áudios do mesmo envio aparecem juntos em Áudios recebidos. */
export type EnvioDaTela = { lote: string; total: number; recebidos: number };

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

// ── Editor (prompt 8) ────────────────────────────────────────────────────

export type FotoDaHistoria = {
  id: string;
  url: string;
  largura: number | null;
  altura: number | null;
  legenda: string | null;
};

export type HistoriaParaEditar = {
  id: string;
  livroId: string;
  autor: string; // como a tela chama o autor
  pergunta: string | null;
  sugestao: { id: string; texto: string } | null;
  texto: TextoDaHistoria;
  marcacoes: Marcacao[];
  rev: number; // stories.texto_rev
  revisada: boolean;
  segmentos: SegmentoDaTela[];
  audios: { id: string; url: string | null }[]; // uma por gravação
  fotos: FotoDaHistoria[];
  versoes: number; // quantas versões guardadas
};

export type VersaoDaTela = {
  numero: number;
  origem: "ia" | "responsavel" | "cofacilitador" | "autor";
  minha: boolean;
  criadaEm: string;
  restauradaDe: number | null;
  titulo: string;
  paragrafos: string[];
};

/** Texto atual que ainda não virou versão (aparece no topo do histórico). */
export type TextoAtualDaTela = {
  minha: boolean;
  origem: VersaoDaTela["origem"] | null;
  em: string | null;
  titulo: string;
  paragrafos: string[];
} | null;
