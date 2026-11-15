import "server-only";
// A versão publicada para a tela (design 5.6). O caminho vem do banco pela sessão (RLS, sem a
// coluna `conteudo`) e só então a chave secreta assina. "Vozes prontas" conta os QR da versão.
import {
  EXPORT_BUCKET,
  EXPORT_PREVIA_URL_S,
  EXPORT_PREVIAS_POR_PEDIDO,
} from "@/lib/config";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";
import { lerConteudo, saiComQr } from "./montagem";
import type { VersaoPublicada } from "./montar-tipos";

export async function versaoPublicada(
  livro: string,
  versao: number,
): Promise<VersaoPublicada | null> {
  const db = await clienteSessao();
  const { data: v } = await db
    .from("book_exports")
    .select(
      "id, versao, estado, paginas, lombada_mm, criado_em, pasta, qr_esperados",
    )
    .eq("book_id", livro)
    .eq("versao", versao)
    .maybeSingle();
  if (!v) return null;

  let vozesProntas = 0;
  let capaUrl: string | null = null;
  let previasUrls: string[] = [];
  if (v.estado === "pronta" && v.pasta) {
    const admin = clienteAdmin();
    const caminhos = [
      `${v.pasta}/capa.jpg`,
      ...Array.from(
        { length: Math.min(v.paginas ?? 0, EXPORT_PREVIAS_POR_PEDIDO) },
        (_, i) => `${v.pasta}/p${String(i + 1).padStart(3, "0")}.jpg`,
      ),
    ];
    const { data: urls } = await admin.storage
      .from(EXPORT_BUCKET)
      .createSignedUrls(caminhos, EXPORT_PREVIA_URL_S);
    const por = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
    capaUrl = por.get(caminhos[0]) ?? null;
    previasUrls = caminhos.slice(1).map((c) => por.get(c) ?? "");
  }
  if (v.estado !== "falhou" && v.qr_esperados > 0) {
    // Só ids: quais códigos a versão congelou e quantos já têm a voz pronta (o QR é vivo, Q5).
    const admin = clienteAdmin();
    const { data: c } = await admin
      .from("book_exports")
      .select("conteudo")
      .eq("id", v.id)
      .maybeSingle();
    if (c?.conteudo) {
      const conteudo = lerConteudo(c.conteudo);
      const codigos = [
        ...conteudo.historias.filter(saiComQr).map((h) => h.qr!.codigo),
        ...conteudo.mensagens.filter(saiComQr).map((m) => m.qr!.codigo),
      ];
      if (codigos.length) {
        const { data: q } = await admin
          .from("qr_codes")
          .select("codigo, audio_pronto_em")
          .in("codigo", codigos);
        vozesProntas = (q ?? []).filter((x) => x.audio_pronto_em).length;
      }
    }
  }
  return {
    id: v.id,
    versao: v.versao,
    estado: v.estado,
    paginas: v.paginas,
    lombadaMm: v.lombada_mm,
    criadoEm: v.criado_em,
    qrEsperados: v.qr_esperados,
    vozesProntas,
    capaUrl,
    previasUrls,
  };
}
