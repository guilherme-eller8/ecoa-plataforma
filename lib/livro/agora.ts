// O que fazer agora (P72): a home do responsável abre com um cartão de uma ação só, que muda
// com o estado do livro. Nova história continua à vista como ação secundária.
import type { Passo } from "@/lib/livro/configuracao";
import type { PerguntaDaTela } from "@/lib/livro/tipos";

export type Agora =
  | { tipo: "confirmar_ia" }
  | { tipo: "pergunta"; pergunta: PerguntaDaTela }
  | { tipo: "primeiras_perguntas" }
  | { tipo: "nova_historia" };

export function oQueFazerAgora({
  podeEscrever,
  iaConfirmada,
  audios,
  falta,
  perguntas,
}: {
  podeEscrever: boolean;
  iaConfirmada: boolean;
  audios: number;
  falta: readonly Passo[];
  perguntas: readonly PerguntaDaTela[]; // na ordem da lista (ordem, criado_em)
}): Agora | null {
  if (!podeEscrever) return null;
  // Áudio parado esperando a confirmação da IA (P41) trava tudo: vem antes.
  if (!iaConfirmada && audios > 0) return { tipo: "confirmar_ia" };
  const proxima = perguntas.find((p) => p.estado === "para_enviar");
  if (proxima) return { tipo: "pergunta", pergunta: proxima };
  if (falta.includes("perguntas")) return { tipo: "primeiras_perguntas" };
  return { tipo: "nova_historia" };
}

export type ResumoDasHistorias = {
  paginas: number; // estimativa pelo texto de hoje (lib/livro/paginas.ts)
  prontas: number; // a família marcou como pronta (revisada)
  paraRevisar: number; // a IA terminou e ninguém marcou como pronta
  andando: number; // ouvindo, separando ou escrevendo
};

const ANDANDO = new Set(["ouvindo", "escrevendo", "dividindo", "separar"]);

export function contarHistorias(
  linhas: readonly { estado: string; revisada: boolean }[],
): Omit<ResumoDasHistorias, "paginas"> {
  let prontas = 0;
  let paraRevisar = 0;
  let andando = 0;
  for (const h of linhas) {
    if (h.estado === "pronta") {
      if (h.revisada) prontas++;
      else paraRevisar++;
    } else if (ANDANDO.has(h.estado)) andando++;
  }
  return { prontas, paraRevisar, andando };
}
