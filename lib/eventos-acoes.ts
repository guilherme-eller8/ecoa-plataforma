// Lista fechada de ações registradas em events. Ação nova = uma linha aqui.
export const ACOES = [
  "entrou", // abriu o livro (no máximo 1 por pessoa, livro e dia)
  "passe_ativado",
  "passe_renovado",
  "acesso_reenviado",
  "passe_vencido", // só o job do banco grava (privado.vencer_passes)
  // Já previstas no PRD (M10):
  "gravou",
  "editou",
  "sugeriu",
  "gerou",
] as const;

export const PAPEIS = [
  "responsavel",
  "cofacilitador",
  "autor",
  "familia",
  "admin",
  "sistema",
] as const;

export type Acao = (typeof ACOES)[number];
export type Papel = (typeof PAPEIS)[number];
