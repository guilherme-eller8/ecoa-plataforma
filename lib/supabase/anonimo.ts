import "server-only";
import { createClient } from "@supabase/supabase-js";
import { envPublico } from "@/lib/env-publico";
import type { Database } from "./tipos";

/**
 * Cliente com a chave pública e sem sessão: só para as funções familia_*. Mesmo que o
 * código do servidor erre, o banco só deixa este cliente passar por essas 3 portas.
 */
export function clienteAnonimo() {
  const env = envPublico();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
