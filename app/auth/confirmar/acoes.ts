"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Resultado } from "@/lib/resultado";
import { clienteSessao } from "@/lib/supabase/servidor";

export async function confirmar(
  _anterior: Resultado | null,
  dados: FormData,
): Promise<Resultado> {
  const tokenHash = z
    .string()
    .min(8)
    .max(256)
    .safeParse(dados.get("token_hash"));
  if (!tokenHash.success)
    return { ok: false, mensagem: "Este link está incompleto." };

  const supabase = await clienteSessao();
  const { error } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash.data,
  });
  if (error)
    return { ok: false, mensagem: "Este link já foi usado ou venceu." };
  redirect("/");
}
