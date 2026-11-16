// Erros do Resend que querem dizer "esta chave de idempotência já foi usada": o e-mail já saiu
// (ou está saindo agora). Não é falha. Parte pura, testada.
const REPETICAO = new Set([
  "invalid_idempotent_request", // mesma chave, texto diferente (em 24 h)
  "concurrent_idempotent_requests", // mesma chave, outro envio em andamento
]);

export function ehRepeticao(nomeDoErro: string | null | undefined): boolean {
  return Boolean(nomeDoErro && REPETICAO.has(nomeDoErro));
}
