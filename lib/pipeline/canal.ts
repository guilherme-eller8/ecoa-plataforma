import "server-only";
// Publica no canal privado do livro pela API do Realtime (sem guardar a mensagem: sem persist).
// Só o servidor publica: a política em realtime.messages não tem insert (T37).
import { clienteAdmin } from "@/lib/supabase/admin";
import { EVENTO_CANAL, topicoDoLivro, type MensagemCanal } from "./regras";

export async function publicarNoLivro(
  livro: string,
  mensagem: MensagemCanal,
): Promise<void> {
  const db = clienteAdmin();
  const canal = db.channel(topicoDoLivro(livro), { config: { private: true } });
  try {
    const r = await canal.httpSend(EVENTO_CANAL, mensagem, { timeout: 5000 });
    if (!r.success)
      console.error("[pipeline] canal recusou", { status: r.status });
  } finally {
    await db.removeChannel(canal);
  }
}
