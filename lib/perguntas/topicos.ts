// "Sobre o que vão conversar?": as perguntas em tópicos pelas fases da vida, na ordem do
// setup. O que não veio do banco (próprias e causos) cai em "Outras perguntas".
import { agruparPorFase, faseDoItem, type Grupo } from "@/lib/enquete/fases";
import type { PerguntaDaTela } from "@/lib/livro/tipos";

/** Lista curta (as iniciais, 1 por fase) vem toda aberta: abrir seria um toque à toa. */
export const ABERTAS_ATE = 8;

export type Topico = Grupo<PerguntaDaTela> & { abertoDeInicio: boolean };

/**
 * Tópicos da tela. Com uma fase só, devolve `null`: a lista vai direto, sem cabeçalho.
 */
export function topicosDaConversa(
  perguntas: readonly PerguntaDaTela[],
): Topico[] | null {
  const grupos = agruparPorFase(perguntas, (p) => faseDoItem(p.bancoId));
  if (grupos.length <= 1) return null;
  const curta = perguntas.length <= ABERTAS_ATE;
  return grupos.map((g) => ({ ...g, abertoDeInicio: curta }));
}
