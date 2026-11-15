"use server";

// Ações da versão publicada (prompt 13, design 5.6). O membro lê a linha pela sessão (RLS, sem a
// coluna `conteudo`); só depois a chave secreta assina as URLs do Storage.
import { after } from "next/server";
import { z } from "zod";
import {
  EXPORT_BUCKET,
  EXPORT_DOWNLOAD_URL_S,
  EXPORT_PREVIA_URL_S,
  EXPORT_PREVIAS_POR_PEDIDO,
} from "@/lib/config";
import { registrarEvento } from "@/lib/eventos";
import { livroDaAcao } from "@/lib/livro/acesso";
import type { VersaoPublicada } from "@/lib/livro/montar-tipos";
import { versaoPublicada } from "@/lib/livro/versao-servidor";
import type { Resposta } from "@/lib/livro/tipos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";

const SEM_ACESSO = {
  ok: false as const,
  mensagem: "Você não tem acesso a este livro.",
};
const GENERICO = {
  ok: false as const,
  mensagem: "Não deu certo agora. Tente de novo.",
};
const versaoOk = z.number().int().min(1).max(9999);

export async function estadoDaVersao(
  livroId: string,
  versao: number,
): Promise<Resposta<VersaoPublicada>> {
  const a = await livroDaAcao(livroId);
  if (!a || !versaoOk.safeParse(versao).success) return SEM_ACESSO;
  const v = await versaoPublicada(a.livro.id, versao);
  return v ? { ok: true, dados: v } : SEM_ACESSO;
}

/** As prévias pedem-se de 4 em 4 páginas, com URL de 10 min. */
export async function previasDaVersao(
  livroId: string,
  versao: number,
  de: number,
): Promise<Resposta<{ urls: string[] }>> {
  const a = await livroDaAcao(livroId);
  if (!a || !versaoOk.safeParse(versao).success) return SEM_ACESSO;
  const db = await clienteSessao();
  const { data } = await db
    .from("book_exports")
    .select("estado, pasta, paginas")
    .eq("book_id", a.livro.id)
    .eq("versao", versao)
    .maybeSingle();
  if (!data || data.estado !== "pronta" || !data.pasta || !data.paginas)
    return GENERICO;
  const inicio = Math.max(1, Math.floor(de));
  const ate = Math.min(data.paginas, inicio + EXPORT_PREVIAS_POR_PEDIDO - 1);
  const caminhos = Array.from(
    { length: Math.max(0, ate - inicio + 1) },
    (_, i) => `${data.pasta}/p${String(inicio + i).padStart(3, "0")}.jpg`,
  );
  if (!caminhos.length) return { ok: true, dados: { urls: [] } };
  const { data: urls } = await clienteAdmin()
    .storage.from(EXPORT_BUCKET)
    .createSignedUrls(caminhos, EXPORT_PREVIA_URL_S);
  const porCaminho = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
  return {
    ok: true,
    dados: { urls: caminhos.map((c) => porCaminho.get(c) ?? "") },
  };
}

/** Qualquer membro baixa (Q7). URL de 60 s, com o nome do arquivo. */
export async function baixarPdf(
  livroId: string,
  versao: number,
  arquivo: "miolo" | "capa",
): Promise<Resposta<{ url: string }>> {
  const a = await livroDaAcao(livroId);
  if (!a || !versaoOk.safeParse(versao).success) return SEM_ACESSO;
  if (arquivo !== "miolo" && arquivo !== "capa") return GENERICO;
  const db = await clienteSessao();
  const { data } = await db
    .from("book_exports")
    .select("id, estado, pasta")
    .eq("book_id", a.livro.id)
    .eq("versao", versao)
    .maybeSingle();
  if (!data || data.estado !== "pronta" || !data.pasta) return GENERICO;
  const nome = `livro-v${versao}-${arquivo}.pdf`;
  const { data: u } = await clienteAdmin()
    .storage.from(EXPORT_BUCKET)
    .createSignedUrl(`${data.pasta}/${arquivo}.pdf`, EXPORT_DOWNLOAD_URL_S, {
      download: nome,
    });
  if (!u?.signedUrl) return GENERICO;
  after(() =>
    registrarEvento({
      quem: a.usuario.id,
      papel: a.livro.papel,
      acao: "livro_baixado",
      livro: a.livro.id,
      detalhes: { export_id: data.id, versao, arquivo },
    }),
  );
  return { ok: true, dados: { url: u.signedUrl } };
}
