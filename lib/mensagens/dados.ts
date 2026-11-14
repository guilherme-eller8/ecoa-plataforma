import "server-only";
import { MENSAGEM_OUVIR_URL_S } from "@/lib/config";
import { tokenDoLink, urlMensagem } from "@/lib/links";
import { assinarLeitura } from "@/lib/storage/assinar";
import { clienteSessao } from "@/lib/supabase/servidor";
import type { MensagemDoLivro } from "./tipos";

// Leitura das mensagens para os membros: pelo cliente da sessão (RLS: só enviadas e arquivadas
// do próprio livro). As URLs assinadas saem só de caminhos lidos assim, nunca da tela (T48).

export async function mensagensDoLivro(
  livro: string,
): Promise<MensagemDoLivro[]> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("family_messages")
    .select(
      "id, nome, relacao, estado, texto, texto_enviado, enviada_em, no_livro, duracao_s, audio_caminho, audio_recebido_em, foto_caminho, foto_recebida_em",
    )
    .eq("book_id", livro)
    .order("enviada_em", { ascending: false });
  const linhas = (data ?? []).filter(
    (m) => m.estado !== "rascunho" && m.texto && m.enviada_em,
  );
  const audios = linhas
    .filter((m) => m.audio_caminho && m.audio_recebido_em)
    .map((m) => m.audio_caminho!);
  const fotos = linhas
    .filter((m) => m.foto_caminho && m.foto_recebida_em)
    .map((m) => m.foto_caminho!);
  const urls = await assinarLeitura(
    "mensagens",
    [...audios, ...fotos],
    MENSAGEM_OUVIR_URL_S,
  );
  return linhas.map((m) => ({
    id: m.id,
    nome: m.nome,
    relacao: m.relacao,
    estado: m.estado === "arquivada" ? "arquivada" : "enviada",
    texto: m.texto!,
    textoEnviado: m.texto_enviado ?? m.texto!,
    enviadaEm: m.enviada_em!,
    noLivro: m.no_livro,
    duracaoS: m.duracao_s,
    audioUrl:
      m.audio_caminho && m.audio_recebido_em
        ? (urls.get(m.audio_caminho) ?? null)
        : null,
    fotoUrl:
      m.foto_caminho && m.foto_recebida_em
        ? (urls.get(m.foto_caminho) ?? null)
        : null,
  }));
}

/** O link ativo (recalculado pelo HMAC, T25), ou null se ainda não existe. */
export async function linkDeMensagens(livro: string): Promise<string | null> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("message_access")
    .select("id, chave_versao")
    .eq("book_id", livro)
    .is("revogado_em", null)
    .maybeSingle();
  return data
    ? urlMensagem(tokenDoLink("mensagem", data.id, data.chave_versao))
    : null;
}

/** Para a home: quantas mensagens enviadas e quantas no livro (RLS, só o próprio livro). */
export async function contarMensagens(
  livro: string,
): Promise<{ total: number; noLivro: number }> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("family_messages")
    .select("no_livro")
    .eq("book_id", livro)
    .eq("estado", "enviada");
  const linhas = data ?? [];
  return {
    total: linhas.length,
    noLivro: linhas.filter((m) => m.no_livro).length,
  };
}
