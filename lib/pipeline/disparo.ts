import "server-only";
// Envia o evento que começa o pipeline. Chamado dentro de after(): o upload nunca fica lento
// nem falha por causa do Inngest. Em falha, a varredura de 15 min reenvia.
import { inngest } from "@/lib/inngest/cliente";
import { logarSemTexto } from "./erros";
import { EVENTO_GRAVACAO, ehAvulsa } from "./regras";

export async function dispararGravacao(
  recordingId: string,
  sufixo?: string,
): Promise<void> {
  try {
    await inngest.send({
      name: EVENTO_GRAVACAO,
      // O mesmo id em 24 h é ignorado pelo Inngest: reenviar o mesmo upload não duplica.
      id: sufixo ? `${recordingId}:${sufixo}` : recordingId,
      data: { recordingId },
    });
  } catch (e) {
    logarSemTexto("disparo", e);
  }
}

/** Depois de confirmar o upload (ou de saber que ele já tinha chegado sem virar história). */
export async function dispararSeAvulsa(g: {
  id: string;
  origem: string;
  lote_id: string | null;
  duracao_s?: number | null;
  processado_em?: string | null;
}) {
  if (g.processado_em || !ehAvulsa(g)) return;
  await dispararGravacao(g.id);
}
