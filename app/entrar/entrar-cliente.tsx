"use client";

import { useSearchParams } from "next/navigation";
import { TelaEntrar } from "@/components/telas/tela-entrar";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { pedirLink } from "./acoes";

export function EntrarCliente() {
  const erro = useSearchParams().get("erro");
  return (
    <TelaEntrar
      erro={erro}
      pedirLink={pedirLink}
      entrarComGoogle={async () => {
        await clienteNavegador().auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
      }}
    />
  );
}
