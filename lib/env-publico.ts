// Variáveis que o navegador também vê. O Next só embute NEXT_PUBLIC_* no bundle
// quando o acesso é literal (process.env.NOME), por isso nada de laço aqui.
import { z } from "zod";

const esquema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: "Falta NEXT_PUBLIC_SUPABASE_URL no .env.local",
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string({
      error: "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local",
    })
    .min(1, "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local"),
});

export function envPublico() {
  return esquema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
