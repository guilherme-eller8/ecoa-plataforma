import "server-only";
// Descadastro do resumo semanal sem login (P63): só desliga o resumo daquele membro.
import { z } from "zod";
import { tokenDoResumoConfere } from "@/lib/links";
import { clienteAdmin } from "@/lib/supabase/admin";

export function linkDeSairValido(membro: string, token: string): boolean {
  return (
    z.uuid().safeParse(membro).success &&
    typeof token === "string" &&
    token.length < 64 &&
    tokenDoResumoConfere(membro, token)
  );
}

export async function desligarResumo(
  membro: string,
  token: string,
): Promise<boolean> {
  if (!linkDeSairValido(membro, token)) return false;
  const { error } = await clienteAdmin().rpc("servico_desligar_resumo", {
    p_membro: membro,
  });
  return !error;
}
