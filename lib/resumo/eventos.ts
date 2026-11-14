// Nome do evento do resumo semanal de um livro (prompt 11, P63).
export const EVENTO_RESUMO_LIVRO = "resumo/livro";

/** Id do evento: o Inngest descarta o repetido do mesmo livro no mesmo domingo. */
export function idDoResumo(livro: string, data: Date): string {
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(data); // AAAA-MM-DD
  return `resumo-${livro}-${dia}`;
}
