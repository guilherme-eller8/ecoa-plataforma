import "server-only";
import { segredoDaRede } from "@/lib/env-qr";
import { hashDoToken } from "@/lib/links";
import { tokenValido } from "@/lib/links-formato";
import { pedirRecorte, urlDaVoz } from "@/lib/qr/player";
import { chaveDeRede, ipDaRequisicao } from "@/lib/qr/rede";
import { clienteAdmin } from "@/lib/supabase/admin";
import { LidaCompartilhada, type EstadoCompartilhada } from "./tipos";

const INDISPONIVEL = { estado: "indisponivel" } as const;

/** /o/{token} (P61): pela chave secreta, sem porta para anon. Vale com o plano vencido. */
export async function lerCompartilhada(
  token: string,
): Promise<EstadoCompartilhada> {
  if (!tokenValido.safeParse(token).success) return INDISPONIVEL;
  try {
    const { data, error } = await clienteAdmin().rpc(
      "servico_ler_compartilhada",
      { p_token_hash: hashDoToken(token) },
    );
    if (error || data === null) return INDISPONIVEL;
    const r = LidaCompartilhada.parse(data);
    if (r.estado === "em_revisao") return r;
    let voz: Extract<EstadoCompartilhada, { estado: "ok" }>["voz"] = null;
    if (r.voz === "ok" && r.audio_caminho) {
      const audioUrl = await urlDaVoz(r.audio_caminho);
      voz = audioUrl ? { tipo: "ok", audioUrl } : null;
    } else if (r.voz === "preparando") {
      if (r.pedir_audio && r.codigo) await pedirRecorte(r.codigo);
      voz = { tipo: "preparando" };
    }
    return {
      estado: "ok",
      autor: r.autor?.trim() || "da família",
      titulo: r.titulo?.trim() || "Uma história",
      ano: r.ano,
      paragrafos: r.paragrafos
        .map((p) => (p ?? "").trim())
        .filter((p) => p !== ""),
      voz,
    };
  } catch {
    return INDISPONIVEL;
  }
}

/** O primeiro Ouvir da página: 1 evento por link, rede e hora (o banco deduplica e grava). */
export async function registrarTocouCompartilhada(
  token: string,
  cabecalhos: Headers,
) {
  if (!tokenValido.safeParse(token).success) return;
  try {
    const chave = chaveDeRede(ipDaRequisicao(cabecalhos), segredoDaRede());
    await clienteAdmin().rpc("servico_compartilhada_tocou", {
      p_token_hash: hashDoToken(token),
      p_chave: chave,
    });
  } catch {
    // a métrica nunca derruba a página
  }
}
