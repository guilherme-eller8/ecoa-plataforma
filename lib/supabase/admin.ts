import "server-only";
import { createClient } from "@supabase/supabase-js";
import { envPublico } from "@/lib/env-publico";
import { envServidor } from "@/lib/env-servidor";
import type { Database } from "./tipos";

/**
 * Cliente com a chave secreta: ignora a RLS. Só no servidor, só depois de conferir quem pede.
 * Escrita de conteúdo do livro com ele precisa chamar privado.livro_editavel antes.
 */
export function clienteAdmin() {
  return createClient<Database>(
    envPublico().NEXT_PUBLIC_SUPABASE_URL,
    envServidor().SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export type ClienteAdmin = ReturnType<typeof clienteAdmin>;
