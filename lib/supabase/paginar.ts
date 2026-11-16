// Leitura em blocos (Evals 1A, docs/designs/evals.md). A API do Supabase devolve no máximo
// `max_rows` linhas por pedido (1.000 no padrão), qualquer que seja o .limit(), e não avisa.
// Aqui se pede bloco a bloco com .range() até um bloco vir incompleto ou chegar ao limite.
// Somas ficam no banco; isto é só para quem precisa das linhas (eventos da Aderência).

/** Tamanho do bloco: igual ou menor que o max_rows do projeto, para nenhum bloco ser cortado. */
export const LINHAS_POR_BLOCO = 1000;

type Bloco<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * `bloco(de, ate)` monta a consulta com `.range(de, ate)` e ordem estável (sem ordem, as
 * páginas se repetem ou pulam linhas). Devolve até `limite` linhas.
 */
export async function lerEmBlocos<T>(
  bloco: (de: number, ate: number) => Bloco<T>,
  limite: number,
  tamanho: number = LINHAS_POR_BLOCO,
): Promise<T[]> {
  const linhas: T[] = [];
  while (linhas.length < limite) {
    const de = linhas.length;
    const ate = Math.min(de + tamanho, limite) - 1;
    const { data, error } = await bloco(de, ate);
    if (error) throw new Error("Não deu para ler do banco.");
    const lidas = data ?? [];
    linhas.push(...lidas);
    if (lidas.length < ate - de + 1) break;
  }
  return linhas;
}
