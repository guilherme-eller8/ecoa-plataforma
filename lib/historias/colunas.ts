// Colunas de `stories` que as telas leem com a sessão. stories tem grant por coluna: pedir uma
// coluna sem grant (rascunho, erro, erro_etapa, revisada_por) faz o banco recusar a consulta
// inteira, e a tela mostra lista vazia. supabase/tests/colunas-sessao.test.ts confere cada uma.

export const COLUNAS_LISTA =
  "id, titulo, estado, prompt_id, criado_em, vista_em, divisao, divisao_de, texto, revisada_em" as const;
export const COLUNAS_LER =
  "id, titulo, estado, prompt_id, pergunta_sugerida" as const;
export const COLUNAS_SITUACAO = "id, estado, criado_em" as const;
export const COLUNAS_EDITAR =
  "id, estado, prompt_id, pergunta_sugerida, texto, texto_marcacoes, texto_rev, revisada_em, estrutura, ano, titulo" as const;
export const COLUNAS_VERSOES =
  "id, estado, titulo, texto, texto_rev, versao_rev, texto_por, texto_origem, texto_em" as const;
export const COLUNAS_DIVISAO = "id, estado, divisao" as const;

export const TODAS_AS_COLUNAS_DA_SESSAO = [
  COLUNAS_LISTA,
  COLUNAS_LER,
  COLUNAS_SITUACAO,
  COLUNAS_EDITAR,
  COLUNAS_VERSOES,
  COLUNAS_DIVISAO,
];

/**
 * Prompt 7: "Deixar fora do livro" encerra o contêiner (falhou, com a divisão final vazia).
 * Ele não aparece na lista. Reconhecido pela divisão, que a sessão pode ler; o código do erro
 * fica só para o admin.
 */
export function deixadaForaDoLivro(s: {
  estado: string;
  divisao: unknown;
}): boolean {
  const final = (s.divisao as { final?: unknown } | null)?.final;
  return s.estado === "falhou" && Array.isArray(final) && final.length === 0;
}
