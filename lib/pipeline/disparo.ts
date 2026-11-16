import "server-only";
// Envia os eventos que começam o pipeline. Chamado dentro de after(): o upload nunca fica lento
// nem falha por causa do Inngest. Em falha, tenta mais uma vez; se ainda falhar, registra
// `erro_servidor` (o admin vê em /admin/erros) e a varredura de 15 min reenvia.
import { inngest } from "@/lib/inngest/cliente";
import { registrarEvento } from "@/lib/eventos";
import { tipoDoErro } from "@/lib/erros-servidor";
import { clienteAdmin } from "@/lib/supabase/admin";
import { logarSemTexto } from "./erros";
import {
  EVENTO_GRAVACAO,
  EVENTO_HISTORIA_CONFIRMADA,
  EVENTO_PROPOSTA,
  chaveDoEvento,
} from "./regras";

const PAUSA_ENTRE_TENTATIVAS_MS = 1_000;

/** O envio que some sem deixar rastro foi o que travou uma gravação por 12 h (16/11). */
async function registrarFalhaDoEnvio(onde: string, e: unknown) {
  logarSemTexto(onde, e);
  await registrarEvento({
    quem: null,
    papel: "sistema",
    acao: "erro_servidor",
    livro: null,
    detalhes: { rota: "/pipeline/disparo", tipo: tipoDoErro(e), origem: onde },
  }).catch(() => {
    // Registrar o erro nunca pode causar outro.
  });
}

/**
 * `loteId` undefined = ler da gravação (admin, consentimento). O id do evento junta a chave e
 * a gravação: o mesmo id em 24 h é ignorado pelo Inngest, então reenviar não duplica.
 * Devolve se o evento chegou ao Inngest.
 */
export async function dispararGravacao(
  recordingId: string,
  sufixo?: string,
  loteId?: string | null,
  historiaId?: string | null,
): Promise<boolean> {
  let lote = loteId;
  let paraHistoria = historiaId;
  try {
    if (lote === undefined || paraHistoria === undefined) {
      const { data, error } = await clienteAdmin()
        .from("recordings")
        .select("lote_id, para_historia")
        .eq("id", recordingId)
        .maybeSingle();
      if (error) throw error;
      lote = data?.lote_id ?? null;
      paraHistoria = data?.para_historia ?? null;
    }
  } catch (e) {
    await registrarFalhaDoEnvio("disparo:leitura", e);
    return false;
  }
  const chave = chaveDoEvento({
    id: recordingId,
    lote_id: lote ?? null,
    para_historia: paraHistoria ?? null,
  });
  const base = chave === recordingId ? recordingId : `${chave}:${recordingId}`;
  const evento = {
    name: EVENTO_GRAVACAO,
    id: sufixo ? `${base}:${sufixo}` : base,
    data: { recordingId, chave },
  };
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      await inngest.send(evento);
      return true;
    } catch (e) {
      if (tentativa === 2) {
        await registrarFalhaDoEnvio("disparo", e);
        return false;
      }
      await new Promise((r) => setTimeout(r, PAUSA_ENTRE_TENTATIVAS_MS));
    }
  }
  return false;
}

/** Depois de confirmar o upload (ou de saber que ele já tinha chegado sem virar história). */
export async function dispararSeRecebida(g: {
  id: string;
  lote_id: string | null;
  para_historia?: string | null;
  processado_em?: string | null;
}) {
  if (g.processado_em) return;
  await dispararGravacao(g.id, undefined, g.lote_id, g.para_historia);
}

/** Prompt 9: tamanho ou "usar este áudio no texto" (o trecho roda na própria ação). */
export async function dispararProposta(propostaId: string, historiaId: string) {
  try {
    await inngest.send({
      name: EVENTO_PROPOSTA,
      id: `proposta:${propostaId}`,
      data: { propostaId, historiaId },
    });
  } catch (e) {
    logarSemTexto("disparo proposta", e);
  }
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
