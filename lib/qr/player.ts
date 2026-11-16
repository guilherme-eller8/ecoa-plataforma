import "server-only";
import { QR_AUDIO_URL_S } from "@/lib/config";
import { segredoDaRede } from "@/lib/env-qr";
import { registrarEvento } from "@/lib/eventos";
import { inngest } from "@/lib/inngest/cliente";
import { EVENTO_QR_RECORTAR } from "@/lib/qr/eventos";
import { assinarLeitura } from "@/lib/storage/assinar";
import { clienteAdmin } from "@/lib/supabase/admin";
import { chaveDeRede, ipDaRequisicao } from "./rede";
import { OuvirQr, type EstadoPlayer } from "./tipos";

/**
 * Pede o recorte da voz ao Inngest, com uma nova tentativa. A reserva vence em 10 min e o próximo
 * acesso pede de novo. Falhou: devolve false, loga e grava `erro_servidor` (a fila não aceitou o
 * evento, por exemplo com a chave do Inngest trocada sem novo deploy). Nunca lança.
 */
export async function pedirRecorte(codigo: string): Promise<boolean> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      await inngest.send({ name: EVENTO_QR_RECORTAR, data: { codigo } });
      return true;
    } catch {
      // tenta mais uma vez
    }
  }
  console.error("[qr] a fila recusou o pedido do recorte da voz");
  try {
    await registrarEvento({
      quem: null,
      papel: "sistema",
      acao: "erro_servidor",
      livro: null,
      detalhes: { rota: "fila:qr/recortar", tipo: "envio_recusado" },
    });
  } catch {
    // Registrar o erro nunca pode causar outro.
  }
  return false;
}

/** URL assinada do recorte da voz (bucket qr), curta como a do player. */
export async function urlDaVoz(caminho: string): Promise<string | null> {
  const urls = await assinarLeitura("qr", [caminho], QR_AUDIO_URL_S);
  return urls.get(caminho) ?? null;
}

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
      if (r.pedir_audio) await pedirRecorte(codigo);
      return { estado: "preparando" };
    }
    if (r.estado !== "ok") return { estado: r.estado };
    const audioUrl = await urlDaVoz(r.audio_caminho);
    if (!audioUrl) return { estado: "erro" };
    if (r.tipo === "mensagem") {
      // O mesmo nome e relação impressos na página; nunca o texto (Q15).
      return {
        estado: "ok",
        titulo: `Mensagem de ${r.nome}, ${r.relacao}`,
        ano: null,
        audioUrl,
      };
    }
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
