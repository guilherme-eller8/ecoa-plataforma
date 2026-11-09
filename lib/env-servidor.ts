import "server-only";
import { z } from "zod";
import { DOMINIO_APP } from "@/lib/config";

const esquema = z.object({
  SUPABASE_SECRET_KEY: z
    .string({ error: "Falta SUPABASE_SECRET_KEY no .env.local" })
    .min(1, "Falta SUPABASE_SECRET_KEY no .env.local"),
  RESEND_API_KEY: z
    .string({ error: "Falta RESEND_API_KEY no .env.local" })
    .min(1, "Falta RESEND_API_KEY no .env.local"),
});

export function envServidor() {
  return esquema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  });
}

type EnvUrl = Partial<
  Record<"APP_URL" | "VERCEL_ENV" | "VERCEL_BRANCH_URL", string>
>;

/** Endereço público do app, para links em e-mails. */
export function urlDoApp(env: EnvUrl = process.env as EnvUrl): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/+$/, "");
  if (env.VERCEL_ENV === "production") return `https://${DOMINIO_APP}`;
  if (env.VERCEL_BRANCH_URL) return `https://${env.VERCEL_BRANCH_URL}`;
  return "http://localhost:3000";
}
