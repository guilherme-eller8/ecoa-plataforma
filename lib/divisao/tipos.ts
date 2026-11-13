// O que a tela "Confira as histórias" recebe do servidor (prompt 7).
import type { HistoriaProposta } from "./limpar";
import type { SegmentoTela } from "./trechos";

export type DivisaoDaTela = {
  historiaId: string;
  /** separar = esperando a conferência; confirmada = já foi para a escrita (outra aba, outra pessoa). */
  situacao: "separar" | "confirmada";
  propostas: HistoriaProposta[];
  segmentos: SegmentoTela[];
  audios: { gravacao: string; parte: number; url: string | null }[];
  perguntas: Record<string, string>; // id → texto, das perguntas citadas na proposta
};

export type AcoesDivisao = {
  confirmar: (
    historias: {
      titulo: string | null;
      segmentos: number[];
      prompt_id: string | null;
      sugerida: string | null;
      ignorada: boolean;
    }[],
    ajustes: {
      juntou: number;
      separou: number;
      tirou: number;
      renomeou: number;
    },
  ) => Promise<
    | { ok: true; dados: { historias: string[] } }
    | { ok: false; mensagem: string }
  >;
};
