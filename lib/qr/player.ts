import "server-only";
import { QR_AUDIO_URL_S } from "@/lib/config";
import { segredoDaRede } from "@/lib/env-qr";
import { inngest } from "@/lib/inngest/cliente";
import { EVENTO_QR_RECORTAR } from "@/lib/qr/eventos";
import { assinarLeitura } from "@/lib/storage/assinar";
import { clienteAdmin } from "@/lib/supabase/admin";
import { chaveDeRede, ipDaRequisicao } from "./rede";
import { OuvirQr, type EstadoPlayer } from "./tipos";

/** Consulta do player (seção 5.4): limite e código no banco, pela chave secreta. */
export async function abrirQr(
  codigo: string,
  cabecalhos: Headers,
): Promise<EstadoPlayer> {
  try {
    const chave = chaveDeRede(ipDaRequisicao(cabecalhos), segredoDaRede());
    const { data, error } = await clienteAdmin().rpc("servico_ouvir_qr", {
      p_codigo: codigo,
      p_chave: chave,
    });
    if (error) return { estado: "erro" };
    const r = OuvirQr.parse(data);
    if (r.estado === "preparando") {
      if (r.pedir_audio)
        await inngest
          .send({ name: EVENTO_QR_RECORTAR, data: { codigo } })
          .catch(() => undefined); // a reserva vence em 10 min e o próximo acesso pede de novo
      return { estado: "preparando" };
    }
    if (r.estado !== "ok") return { estado: r.estado };
    const urls = await assinarLeitura("qr", [r.audio_caminho], QR_AUDIO_URL_S);
    const audioUrl = urls.get(r.audio_caminho);
    if (!audioUrl) return { estado: "erro" };
    return {
      estado: "ok",
      titulo: r.titulo?.trim() || "Uma história",
      ano: r.ano,
      audioUrl,
    };
  } catch {
    return { estado: "erro" };
  }
}

/** O primeiro "Ouvir" da página: 1 evento por código, rede e hora (o banco deduplica). */
export async function registrarTocou(codigo: string, cabecalhos: Headers) {
  try {
    const chave = chaveDeRede(ipDaRequisicao(cabecalhos), segredoDaRede());
    await clienteAdmin().rpc("servico_qr_tocou", {
      p_codigo: codigo,
      p_chave: chave,
    });
  } catch {
    // a métrica nunca derruba o player
  }
}
