import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { envPublico } from "@/lib/env-publico";
import type { Database } from "./tipos";

/** Cliente com a sessão de quem está usando: a RLS decide o que ele vê. */
export async function clienteSessao() {
  // O cliente confere a validade da sessão com Date.now(). Na pré-busca do Next 16 a página
  // roda com os cookies mas sem relógio liberado ("unstable value Date.now()"): connection()
  // deixa essa parte só para a requisição de verdade.
  await connection();
  const env = envPublico();
  const loja = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => loja.getAll(),
        setAll: (paraGravar) => {
          try {
            for (const { name, value, options } of paraGravar)
              loja.set(name, value, options);
          } catch {
            // Server Component não grava cookie; o proxy.ts renova a sessão.
          }
        },
      },
    },
  );
}
