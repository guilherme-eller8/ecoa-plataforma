// Lista fechada de ações registradas em events. Ação nova = uma linha aqui.
export const ACOES = [
  "entrou", // abriu o livro (no máximo 1 por pessoa, livro e dia)
  "plano_ativado",
  "plano_renovado",
  "acesso_reenviado",
  "plano_vencido", // só o job do banco grava (privado.vencer_planos)
  // Já previstas no PRD (M10):
  "gravou",
  "editou",
  "sugeriu",
  "gerou",
  // Prompt 4: configuração, perguntas, causos e enquete.
  "configurou",
  "subiu_fotos",
  "adicionou_pergunta",
  "enviou_pergunta",
  "gerou_link_familia",
  "trocou_link_familia",
  "virou_pergunta",
  "abriu_enquete",
  "encerrou_enquete",
  "enquete_salvou",
  "removeu_voto",
  "votou", // família; detalhes: { votante }
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
