"use server";

// Ações das telas de histórias (prompt 6).
import { z } from "zod";
import { livroDaAcao } from "@/lib/livro/acesso";
import { clienteSessao } from "@/lib/supabase/servidor";

/** O cartão "Pronta" apareceu na tela de alguém do livro: sem e-mail (P42). */
export async function marcarHistoriaVista(
  livroId: string,
  historiaId: string,
): Promise<void> {
  if (!z.uuid().safeParse(historiaId).success) return;
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return;
  const supabase = await clienteSessao();
  // A função confere de novo que quem chama é membro do livro da história.
  await supabase.rpc("marcar_historia_vista", { p_story: historiaId });
}
