import "server-only";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { after } from "next/server";
import { envPublico } from "@/lib/env-publico";

/**
 * Pede ao Supabase o e-mail com o link de entrada. O envio roda depois da resposta (after),
 * para o tempo de resposta não revelar quem tem livro. O Supabase só envia para contas que
 * existem (shouldCreateUser: false) e aplica o próprio limite de envios.
 */
export async function enviarLinkDeEntrada(email: string): Promise<void> {
  const origem = (await headers()).get("origin");
  after(async () => {
    const env = envPublico();
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          flowType: "implicit",
        },
      },
    );
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: origem ? `${origem}/auth/confirmar` : undefined,
      },
    });
    if (error && error.code !== "otp_disabled" && error.status !== 422) {
      console.error("[entrar] falha ao pedir link", {
        codigo: error.code,
        status: error.status,
      });
    }
  });
}
