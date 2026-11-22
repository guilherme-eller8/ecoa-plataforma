"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fraseDoErro } from "@/lib/erros-banco";
import type { Resposta } from "@/lib/livro/tipos";
import { clienteSessao } from "@/lib/supabase/servidor";

/** Aceitar não usa o token: o banco confere o e-mail confirmado de quem está logado (P59). */
export async function aceitarConvite(convite: string): Promise<Resposta> {
  if (!z.uuid().safeParse(convite).success)
    return { ok: false, mensagem: "Convite não encontrado." };
  const db = await clienteSessao();
  const { data, error } = await db.rpc("aceitar_convite", {
    p_convite: convite,
  });
  if (error || !data) return { ok: false, mensagem: fraseDoErro(error) };
  revalidatePath("/", "layout");
  // Quem entra por convite quer gravar: cai direto na gravação, com a oferta da tela inicial.
  redirect(`/livro/${data}/historias/gravar?bemvindo=1`);
}
