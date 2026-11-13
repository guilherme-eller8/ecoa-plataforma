import "server-only";
// Publica no canal privado do livro pela API do Realtime (sem guardar a mensagem: sem persist).
// Só o servidor publica: a política em realtime.messages não tem insert (T37).
import { clienteAdmin } from "@/lib/supabase/admin";
import {
  EVENTO_CANAL,
  EVENTO_CANAL_PROPOSTA,
  topicoDoLivro,
  type MensagemCanal,
  type MensagemProposta,
} from "./regras";

export async function publicarNoLivro(
  livro: string,
  mensagem: MensagemCanal | MensagemProposta,
): Promise<void> {
  const db = clienteAdmin();
  const canal = db.channel(topicoDoLivro(livro), { config: { private: true } });
  // Proposta vai num evento próprio: quem só ouve o pipeline (a lista) não a recebe.
  const evento =
    mensagem.tipo === "proposta" ? EVENTO_CANAL_PROPOSTA : EVENTO_CANAL;
  try {
    const r = await canal.httpSend(evento, mensagem, { timeout: 5000 });
    if (!r.success)
      console.error("[pipeline] canal recusou", { status: r.status });
  } finally {
    await db.removeChannel(canal);
  }
}
