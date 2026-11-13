import "server-only";
// Envia os eventos que começam o pipeline. Chamado dentro de after(): o upload nunca fica lento
// nem falha por causa do Inngest. Em falha, a varredura de 15 min reenvia.
import { inngest } from "@/lib/inngest/cliente";
import { clienteAdmin } from "@/lib/supabase/admin";
import { logarSemTexto } from "./erros";
import {
  EVENTO_GRAVACAO,
  EVENTO_HISTORIA_CONFIRMADA,
  chaveDoEvento,
} from "./regras";

/**
 * `loteId` undefined = ler da gravação (admin, consentimento). O id do evento junta a chave e
 * a gravação: o mesmo id em 24 h é ignorado pelo Inngest, então reenviar não duplica.
 */
export async function dispararGravacao(
  recordingId: string,
  sufixo?: string,
  loteId?: string | null,
): Promise<void> {
  try {
    let lote = loteId;
    if (lote === undefined) {
      const { data } = await clienteAdmin()
        .from("recordings")
        .select("lote_id")
        .eq("id", recordingId)
        .maybeSingle();
      lote = data?.lote_id ?? null;
    }
    const chave = chaveDoEvento({ id: recordingId, lote_id: lote });
    const base =
      chave === recordingId ? recordingId : `${chave}:${recordingId}`;
    await inngest.send({
      name: EVENTO_GRAVACAO,
      id: sufixo ? `${base}:${sufixo}` : base,
      data: { recordingId, chave },
    });
  } catch (e) {
    logarSemTexto("disparo", e);
  }
}

/** Depois de confirmar o upload (ou de saber que ele já tinha chegado sem virar história). */
export async function dispararSeRecebida(g: {
  id: string;
  lote_id: string | null;
  processado_em?: string | null;
}) {
  if (g.processado_em) return;
  await dispararGravacao(g.id, undefined, g.lote_id);
}

/** Depois de confirmar uma divisão: cada história vai para a escrita (prompt 7). */
export async function dispararEscrita(historias: string[], sufixo?: string) {
  if (historias.length === 0) return;
  try {
    await inngest.send(
      historias.map((historiaId) => ({
        name: EVENTO_HISTORIA_CONFIRMADA,
        id: sufixo
          ? `historia:${historiaId}:${sufixo}`
          : `historia:${historiaId}`,
        data: { historiaId },
      })),
    );
  } catch (e) {
    logarSemTexto("disparo escrita", e);
  }
}
