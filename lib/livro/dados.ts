import "server-only";
import { envLinks } from "@/lib/env-links";
import { tokenDoLink, urlAutor, urlFamilia } from "@/lib/links";
import { assinarLeitura } from "@/lib/storage/assinar";
import { clienteSessao } from "@/lib/supabase/servidor";
import type { LivroDoMembro } from "@/lib/sessao";
import { configuracaoDo, nomeDoAutor } from "./acesso";
import type {
  AudioDaTela,
  CausoDaTela,
  EnqueteDaTela,
  FotoDaTela,
  LivroDaTela,
  PerguntaDaTela,
} from "./tipos";

// Leituras do responsável. Sempre com a sessão (a RLS decide) e com as colunas listadas:
// várias tabelas têm grant por coluna, e select('*') daria permission denied.
// A chave secreta só assina URLs do Storage, depois que a sessão já leu a linha.

const assinar = assinarLeitura;

export async function livroDaTela(
  livro: LivroDoMembro,
  podeEscrever: boolean,
): Promise<LivroDaTela> {
  let fotoAutorUrl: string | null = null;
  if (livro.autor_foto_id) {
    const supabase = await clienteSessao();
    const { data } = await supabase
      .from("photos")
      .select("caminho")
      .eq("id", livro.autor_foto_id)
      .eq("book_id", livro.id)
      .maybeSingle();
    if (data)
      fotoAutorUrl =
        (await assinar("acervo", [data.caminho])).get(data.caminho) ?? null;
  }
  return {
    id: livro.id,
    autor: nomeDoAutor(livro),
    autorNome: livro.autor_nome,
    autorApelido: livro.autor_apelido,
    autorCelular: livro.autor_celular,
    parentesco: livro.autor_parentesco,
    fotoAutorUrl,
    configuracao: configuracaoDo(livro),
    podeEscrever,
    ehResponsavel: livro.papel === "responsavel",
    iaConfirmada: Boolean(livro.ia_consentimento_em),
  };
}

export async function perguntasDoLivro(
  livro: string,
): Promise<PerguntaDaTela[]> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("prompts")
    .select(
      "id, tipo, texto, origem, banco_id, causo_id, photo_id, estado, enviada_em, ordem, criado_em, causos(nome), photos(caminho)",
    )
    .eq("book_id", livro)
    .order("ordem")
    .order("criado_em");
  const linhas = data ?? [];
  const urls = await assinar(
    "acervo",
    linhas.flatMap((p) => (p.photos ? [p.photos.caminho] : [])),
  );
  return linhas.map((p) => ({
    id: p.id,
    tipo: p.tipo,
    texto: p.texto,
    origem: p.origem,
    bancoId: p.banco_id,
    causoId: p.causo_id,
    sugeridoPor: p.causos?.nome ?? null,
    fotoUrl: p.photos ? (urls.get(p.photos.caminho) ?? null) : null,
    estado: p.estado,
    enviadaEm: p.enviada_em,
  }));
}

export async function causosDoLivro(livro: string): Promise<CausoDaTela[]> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("causos")
    .select(
      "id, tipo, nome, texto, audio_caminho, audio_recebido_em, duracao_s, estado, criado_em",
    )
    .eq("book_id", livro)
    .order("criado_em", { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    tipo: c.tipo,
    nome: c.nome,
    texto: c.texto,
    temAudio: Boolean(c.audio_caminho && c.audio_recebido_em),
    duracaoS: c.duracao_s,
    estado: c.estado,
    criadoEm: c.criado_em,
  }));
}

/** A enquete aberta; sem ela, a última encerrada; sem nenhuma, null. */
export async function enqueteDoLivro(
  livro: string,
): Promise<EnqueteDaTela | null> {
  const supabase = await clienteSessao();
  const { data: enquetes } = await supabase
    .from("polls")
    .select("id, estado, aberta_em")
    .eq("book_id", livro)
    .order("aberta_em", { ascending: false })
    .limit(5);
  const enquete =
    (enquetes ?? []).find((e) => e.estado === "aberta") ?? (enquetes ?? [])[0];
  if (!enquete) return null;
  const [{ data: itens }, { data: votos }] = await Promise.all([
    supabase
      .from("poll_items")
      .select("id, texto, ordem, prompt_id, banco_id")
      .eq("poll_id", enquete.id)
      .order("ordem"),
    supabase
      .from("poll_votes")
      .select("poll_item_id, votante, nome, criado_em")
      .eq("poll_id", enquete.id),
  ]);
  return {
    id: enquete.id,
    estado: enquete.estado,
    abertaEm: enquete.aberta_em,
    itens: itens ?? [],
    votos: votos ?? [],
  };
}

export async function fotosDoLivro(livro: string): Promise<FotoDaTela[]> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("photos")
    .select("id, caminho, largura, altura, legenda")
    .eq("book_id", livro)
    .order("criado_em", { ascending: false });
  const urls = await assinar(
    "acervo",
    (data ?? []).map((f) => f.caminho),
  );
  return (data ?? []).flatMap((f) => {
    const url = urls.get(f.caminho);
    return url
      ? [
          {
            id: f.id,
            url,
            largura: f.largura,
            altura: f.altura,
            legenda: f.legenda,
          },
        ]
      : [];
  });
}

/** O link da família ativo, recalculado do id e da versão. Só lê; gerar é uma ação. */
export async function linkDaFamilia(livro: string): Promise<string | null> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("family_access")
    .select("id, chave_versao")
    .eq("book_id", livro)
    .is("revogado_em", null)
    .maybeSingle();
  if (!data) return null;
  return urlFamilia(
    tokenDoLink("familia", data.id, data.chave_versao, envLinks()),
  );
}

/** A base do link do autor (/a/<token>), recalculada do id e da versão. Só lê; gerar é uma ação. */
export async function linkDoAutor(livro: string): Promise<string | null> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("author_access")
    .select("id, chave_versao")
    .eq("book_id", livro)
    .is("revogado_em", null)
    .maybeSingle();
  if (!data) return null;
  return urlAutor(tokenDoLink("autor", data.id, data.chave_versao, envLinks()));
}

/** Áudios que já chegaram, do mais novo ao mais antigo, com URL assinada por 1 h. */
export async function audiosDoLivro(livro: string): Promise<AudioDaTela[]> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("recordings")
    .select(
      "id, origem, titulo, nome_arquivo, caminho, duracao_s, tamanho_bytes, recebido_em, processado_em, lote_id, lote_total, lote_ordem, prompts(texto)",
    )
    .eq("book_id", livro)
    .eq("upload", "recebido")
    .order("recebido_em", { ascending: false });
  const linhas = data ?? [];
  const urls = await assinar(
    "audios",
    linhas.map((a) => a.caminho),
  );
  return linhas.map((a) => ({
    id: a.id,
    origem: a.origem,
    titulo: a.titulo,
    nomeArquivo: a.nome_arquivo,
    pergunta: a.prompts?.texto ?? null,
    duracaoS: a.duracao_s,
    tamanhoBytes: a.tamanho_bytes,
    recebidoEm: a.recebido_em ?? "",
    url: urls.get(a.caminho) ?? null,
    processado: Boolean(a.processado_em),
    // Prompt 7: arquivos do mesmo envio (lote ou partes da conversa) aparecem juntos.
    envio:
      a.lote_id && (a.lote_total ?? 1) > 1
        ? { id: a.lote_id, total: a.lote_total ?? 1, ordem: a.lote_ordem ?? 1 }
        : null,
  }));
}

/** Quantos áudios chegaram (para a home). */
export async function totalDeAudios(livro: string): Promise<number> {
  const supabase = await clienteSessao();
  const { count } = await supabase
    .from("recordings")
    .select("id", { count: "exact", head: true })
    .eq("book_id", livro)
    .eq("upload", "recebido");
  return count ?? 0;
}
