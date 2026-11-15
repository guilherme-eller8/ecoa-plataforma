// Tabelas da família: o token do autor nunca alcança nenhuma (T5, T46). Usada pelos testes do
// banco (autor-isolamento) e das rotas do autor (lib/autor/rotas-autor.test.ts).
export const TABELAS_DA_FAMILIA = [
  "polls",
  "poll_items",
  "poll_votes",
  "causos",
  "family_access",
  "family_messages",
  "message_access",
  // Prompt 13: o livro montado e as versões publicadas levam o texto das mensagens (P21, T5).
  "book_layouts",
  "book_exports",
] as const;

// Buckets da família: as rotas do autor nunca os citam (lib/autor/rotas-autor.test.ts).
export const BUCKETS_DA_FAMILIA = [
  "causos",
  "mensagens",
  "exportacoes",
] as const;
