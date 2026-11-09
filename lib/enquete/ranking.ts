// Ranking da enquete: mais votos primeiro; no empate, a ordem do item.
// Uma entrada por votante (duas "Ana" aparecem duas vezes: dois aparelhos).

export type ItemDaEnquete = {
  id: string;
  texto: string;
  ordem: number;
  prompt_id: string | null;
};
export type VotoDaEnquete = {
  poll_item_id: string;
  votante: string;
  nome: string;
  criado_em: string;
};
export type Votante = { votante: string; nome: string };
export type LinhaDoRanking = ItemDaEnquete & {
  votos: number;
  votantes: Votante[];
  posicao: number;
};

export function ranking(
  itens: ItemDaEnquete[],
  votos: VotoDaEnquete[],
): LinhaDoRanking[] {
  const ordenados = [...votos].sort((a, b) =>
    a.criado_em.localeCompare(b.criado_em),
  );
  const linhas = itens.map((item) => {
    const doItem = ordenados.filter((v) => v.poll_item_id === item.id);
    return {
      ...item,
      votos: doItem.length,
      votantes: doItem.map(({ votante, nome }) => ({ votante, nome })),
      posicao: 0,
    };
  });
  linhas.sort((a, b) => b.votos - a.votos || a.ordem - b.ordem);
  linhas.forEach((l, i) => (l.posicao = i + 1));
  return linhas;
}

/** Os N primeiros com pelo menos 1 voto. Empate na fronteira não estica a lista. */
export function topN(linhas: LinhaDoRanking[], n: number): LinhaDoRanking[] {
  return linhas.filter((l) => l.votos > 0).slice(0, Math.max(0, n));
}

/** Pessoas distintas que votaram (por votante). */
export function totalDeVotantes(votos: VotoDaEnquete[]): number {
  return new Set(votos.map((v) => v.votante)).size;
}
