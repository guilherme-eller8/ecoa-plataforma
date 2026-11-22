import "server-only";
// Credenciais do Mercado Pago (T58). Só em Production e no .env.local, nunca com NEXT_PUBLIC_.
// Sem elas, /comprar mostra "A compra abre em breve." e o aviso responde 503.
import { z } from "zod";

const esquema = z.object({
  MP_ACCESS_TOKEN: z.string().min(10),
  MP_WEBHOOK_SEGREDO: z.string().min(10),
  MP_MODO: z.enum(["teste", "producao"]),
});

export type EnvPagamento = z.infer<typeof esquema>;

/** As 3 variáveis, ou null se alguma faltar (a compra fica fechada). */
export function envPagamento(
  env: Record<string, string | undefined> = process.env,
): EnvPagamento | null {
  const r = esquema.safeParse({
    MP_ACCESS_TOKEN: env.MP_ACCESS_TOKEN,
    MP_WEBHOOK_SEGREDO: env.MP_WEBHOOK_SEGREDO,
    MP_MODO: env.MP_MODO,
  });
  return r.success ? r.data : null;
}
