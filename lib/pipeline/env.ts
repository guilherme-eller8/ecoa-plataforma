import "server-only";
import { z } from "zod";

// Chaves que só o pipeline usa. Separadas de envServidor para o resto do app não exigir
// chaves de IA (testes, telas, e-mail de acesso).
const esquema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "Falta ANTHROPIC_API_KEY"),
  ELEVENLABS_API_KEY: z.string().min(1, "Falta ELEVENLABS_API_KEY"),
});

export function envPipeline() {
  return esquema.parse({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  });
}

/**
 * Com INNGEST_DEV definido, o SDK aceita chamadas sem assinatura. Em produção e prévia isso
 * abriria a rota para qualquer um executar o pipeline com a chave secreta: trava.
 */
type EnvInngest = Partial<
  Record<"VERCEL_ENV" | "INNGEST_DEV" | "INNGEST_SIGNING_KEY", string>
>;

export function travarModoDev(env: EnvInngest = process.env as EnvInngest) {
  const nuvem = env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview";
  if (nuvem && env.INNGEST_DEV)
    throw new Error(
      "INNGEST_DEV não pode estar definido em produção ou prévia",
    );
  if (env.VERCEL_ENV === "production" && !env.INNGEST_SIGNING_KEY)
    throw new Error("Falta INNGEST_SIGNING_KEY");
}

/**
 * T56: a prévia nunca serve as funções do Inngest. Em 14 e 15/11 o Inngest sincronizou 5 vezes
 * com URLs de prévia e os jobs de produção rodaram código de branch. Com a rota fora do ar na
 * prévia, a sincronização falha e a URL de produção continua valendo.
 */
export function servirInngest(
  env: Partial<Record<"VERCEL_ENV", string>> = process.env as Partial<
    Record<"VERCEL_ENV", string>
  >,
): boolean {
  return env.VERCEL_ENV !== "preview";
}
