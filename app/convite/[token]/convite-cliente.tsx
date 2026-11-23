"use client";

import {
  TelaConvite,
  type AcoesTelaConvite,
  type EstadoTelaConvite,
} from "@/components/telas/tela-convite";
import { clienteNavegador } from "@/lib/supabase/navegador";

/** Põe o login do Google na tela (só existe no navegador). A volta cai na home (P81). */
export function ConviteCliente(
  props: { estado: EstadoTelaConvite } & Omit<
    AcoesTelaConvite,
    "entrarComGoogle"
  >,
) {
  return (
    <TelaConvite
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
