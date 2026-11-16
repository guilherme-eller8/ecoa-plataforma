// Quem atende o Inngest. Só existe um ambiente no Inngest (production) e a integração da Vercel
// sincronizava cada deploy de preview nele: o app de produção passava a chamar o preview (sem
// as chaves do Supabase nem do Resend), e crons e pipeline paravam até o próximo deploy de
// produção (13/11 a 15/11 e 16/11). Preview recusa a rota: a sincronização falha e produção
// fica com a última boa. Servir zero funções seria pior: apagaria as funções de produção.
// Parte pura, testada.

export function inngestAtendeAqui(
  env: Record<string, string | undefined>,
): boolean {
  return env.VERCEL_ENV !== "preview";
}
