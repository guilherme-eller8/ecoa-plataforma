import "server-only";
// Leitura da montagem para as telas e as ações (design 5.1). Tudo pelo cliente da sessão (RLS e as
// funções montagem_* conferem membro); a chave secreta só assina URLs depois que a sessão leu a linha.
import { COR_CAPA_PADRAO } from "@/lib/config";
import { assinarLeitura } from "@/lib/storage/assinar";
import { clienteSessao } from "@/lib/supabase/servidor";
import { alertasDoLivro } from "./alertas";
import { nomeDoAutor, type LivroComAcesso } from "./acesso";
import { fotosDoLivro } from "./dados";
import {
  corDaCapa,
  lerConteudo,
  saiComQr,
  type ConteudoDoLivro,
} from "./montagem";
import type { MontagemDaTela, VersaoDaTela } from "./montar-tipos";

/** O conteúdo como o banco o monta agora (a mesma função que a publicação congela) e o hash dele. */
export async function lerMontagem(
  livro: string,
): Promise<{ conteudo: ConteudoDoLivro; hash: string } | null> {
  const db = await clienteSessao();
  const { data, error } = await db.rpc("montagem_conteudo", { p_book: livro });
  if (error || !data) return null;
  const conteudo = lerConteudo(data);
  return { conteudo, hash: conteudo.hash ?? "" };
}

export async function versoesDoLivro(livro: string): Promise<VersaoDaTela[]> {
  const db = await clienteSessao();
  // O membro lê tudo menos `conteudo` (grant por coluna): nunca pedir `select *`.
  const { data } = await db
    .from("book_exports")
    .select("id, versao, estado, paginas, criado_em")
    .eq("book_id", livro)
    .order("versao", { ascending: false });
  return (data ?? []).map((v) => ({
    id: v.id,
    versao: v.versao,
    estado: v.estado,
    paginas: v.paginas,
    criadoEm: v.criado_em,
  }));
}

export async function montagemDaTela(
  a: LivroComAcesso,
): Promise<MontagemDaTela | null> {
  const livro = a.livro.id;
  const db = await clienteSessao();
  const [lida, layout, versoes, fotos, membros] = await Promise.all([
    lerMontagem(livro),
    db
      .from("book_layouts")
      .select("capa_foto_id, capa_foco_x, capa_foco_y, titulo")
      .eq("book_id", livro)
      .maybeSingle(),
    versoesDoLivro(livro),
    fotosDoLivro(livro),
    a.livro.papel === "responsavel"
      ? Promise.resolve({ data: [] })
      : db.rpc("membros_do_livro", { p_livro: livro }),
  ]);
  if (!lida) return null;
  const { conteudo, hash } = lida;
  const capaFoto = conteudo.livro.capa_foto;
  const capaFotoUrl = capaFoto
    ? ((await assinarLeitura("acervo", [capaFoto.caminho])).get(
        capaFoto.caminho,
      ) ?? null)
    : null;
  const responsavel =
    (membros.data ?? []).find((m) => m.papel === "responsavel")?.nome ?? null;
  const tituloEscolhido = Boolean(conteudo.livro.titulo?.trim());
  return {
    rev: conteudo.livro.rev,
    hash,
    titulo:
      conteudo.livro.titulo?.trim() || `Histórias de ${nomeDoAutor(a.livro)}`,
    tituloEscolhido,
    subtitulo: conteudo.livro.subtitulo ?? "",
    dedicatoria: conteudo.livro.dedicatoria ?? "",
    capaCor: corDaCapa(conteudo.livro.capa_cor || COR_CAPA_PADRAO),
    capaFotoId: layout.data?.capa_foto_id ?? null,
    capaFocoX: layout.data?.capa_foco_x ?? 50,
    capaFocoY: layout.data?.capa_foco_y ?? 50,
    capaFotoUrl,
    fotos: fotos.map((f) => ({
      id: f.id,
      url: f.url,
      largura: f.largura,
      altura: f.altura,
    })),
    historias: conteudo.historias.map((h) => ({
      id: h.id,
      titulo: h.titulo,
      ano: h.ano,
      revisada: h.revisada,
      incluida: h.incluida,
      palavras: h.palavras,
      comQr: saiComQr(h),
    })),
    mensagens: conteudo.mensagens.map((m) => ({
      id: m.id,
      nome: m.nome,
      relacao: m.relacao,
      incluida: m.incluida,
      previa: (m.texto ?? "").slice(0, 120),
      comQr: saiComQr(m),
    })),
    alertas: alertasDoLivro(conteudo),
    proximaVersao: (versoes[0]?.versao ?? 0) + 1,
    versoes,
    responsavel,
    paginasIniciais: null,
  };
}
