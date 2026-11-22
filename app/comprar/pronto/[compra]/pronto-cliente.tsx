"use client";

import { TelaCompraPronta } from "@/components/telas/tela-compra-pronta";
import type { EstadoDaTela } from "@/lib/pagamento/estado";
import { clienteNavegador } from "@/lib/supabase/navegador";

export function ProntoCliente(props: {
  estado: EstadoDaTela;
  emailMascarado: string;
  tentarUrl: string | null;
  esperaMaxMin: number;
}) {
  return (
    <TelaCompraPronta
      {...props}
      entrarComGoogle={async () => {
        await clienteNavegador().auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
      }}
    />
  );
}
