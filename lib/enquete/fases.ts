// Categorias da enquete (P35): as 8 fases da vida, em ordem, mais "Outras perguntas" para o
// que não veio do banco (próprias e sugestões da família). A fase sai do banco_id
// ("infancia-03"), a mesma regra de privado.fase_do_item no banco.
import { VOTOS_POR_FASE } from "@/lib/config";
import { TEMAS } from "@/lib/perguntas/banco";

export type Categoria = { id: string; nome: string };

export const OUTRAS: Categoria = { id: "outras", nome: "Outras perguntas" };

export const CATEGORIAS: readonly Categoria[] = [
  ...TEMAS.map((t) => ({ id: t.id, nome: t.nome })),
  OUTRAS,
];

const IDS = new Set(CATEGORIAS.map((c) => c.id));

export function faseDoItem(bancoId: string | null | undefined): string {
  const prefixo = bancoId?.split("-")[0] ?? "";
  return prefixo && IDS.has(prefixo) ? prefixo : OUTRAS.id;
}

export function nomeDaFase(id: string): string {
  return CATEGORIAS.find((c) => c.id === id)?.nome ?? OUTRAS.nome;
}

export type Grupo<T> = { categoria: Categoria; itens: T[] };

/** Agrupa na ordem das fases da vida; categorias sem item ficam de fora. */
export function agruparPorFase<T>(
  itens: readonly T[],
  faseDe: (item: T) => string,
): Grupo<T>[] {
  return CATEGORIAS.map((categoria) => ({
    categoria,
    itens: itens.filter((i) => {
      const f = faseDe(i);
      return (IDS.has(f) ? f : OUTRAS.id) === categoria.id;
    }),
  })).filter((g) => g.itens.length > 0);
}

/** Pode marcar mais um item desta fase? (até VOTOS_POR_FASE por fase) */
export function cabeNaFase(
  marcadosNaFase: number,
  limite: number = VOTOS_POR_FASE,
): boolean {
  return marcadosNaFase < limite;
}
