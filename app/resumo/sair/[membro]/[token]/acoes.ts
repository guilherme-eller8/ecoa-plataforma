"use server";

import type { Resposta } from "@/lib/livro/tipos";
import { desligarResumo } from "@/lib/resumo/sair";

export async function sairDoResumo(
  membro: string,
  token: string,
): Promise<Resposta> {
  return (await desligarResumo(membro, token))
    ? { ok: true }
    : { ok: false, mensagem: "Este link não vale mais." };
}
