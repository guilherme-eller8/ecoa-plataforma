// Tabelas da família: o token do autor nunca alcança nenhuma (T5, T46). Usada pelos testes do
// banco (autor-isolamento) e das rotas do autor (lib/autor/rotas-autor.test.ts).
export const TABELAS_DA_FAMILIA = [
  "polls",
  "poll_items",
  "poll_votes",
  "causos",
  "family_access",
  "family_messages",
] as const;
