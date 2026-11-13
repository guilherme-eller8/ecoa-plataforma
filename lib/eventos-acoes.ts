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
  // Prompt 5A: áudios gravados fora da plataforma.
  "subiu_audio", // detalhes: { recording, com_pergunta }
  // Prompt 5: gravador e link do autor. A gravação usa "gravou" com { recording, origem }.
  "autor_consentiu",
  "gerou_link_autor",
  "trocou_link_autor",
  // Prompt 6: pipeline. detalhes: { story } ou { recording }.
  "historia_pronta", // sistema; o e-mail saiu (ninguém viu a história na tela)
  "memoria_falhou", // sistema; a história ficou pronta, mas sem resumo e nomes
  "consentiu_ia", // responsável confirmou o processamento com IA (P41)
  "processamento_refeito", // admin: Tentar de novo ou Processar
  "nome_ajustado", // aceitou, corrigiu, recusou ou acrescentou um nome do glossário
  // Prompt 7: divisão em histórias. Detalhes só com contagens (medida da hipótese).
  "divisao_proposta", // sistema; { story, historias, gravacoes, minutos }
  "divisao_confirmada", // { story, propostas, confirmadas, juntou, separou, tirou, renomeou }
  "pergunta_sugerida_aceita", // { story }
  "pergunta_sugerida_ignorada", // { story }
  // Prompt 8: editor. "editou" = uma sessão de edição { story }; restaurou { story, versao }.
  "historia_revisada", // marcou como pronta { story }
  "historia_reaberta", // voltou para rascunho { story }
  "restaurou_versao", // { story, versao }
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
