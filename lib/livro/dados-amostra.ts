import "server-only";
// O que a página de amostra imprime: o texto atual (o da família vale mais que o da IA), o
// título, o ano, a 1ª foto e o QR. Tudo pela sessão do membro, filtrado pelo livro.
import { normalizarTexto } from "@/lib/editor/conteudo";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";

export type ParaAmostra = {
  titulo: string;
  ano: number | null;
  paragrafos: string[];
  codigo: string | null;
  vozPronta: boolean;
  desligado: boolean;
  foto: {
    caminho: string;
    largura: number | null;
    altura: number | null;
  } | null;
};

export async function dadosDaAmostra(
  livro: string,
  historia: string,
): Promise<ParaAmostra | null> {
  const supabase = await clienteSessao();
  const { data: s } = await supabase
    .from("stories")
    .select("id, titulo, ano, texto, estado, revisada_em")
    .eq("book_id", livro)
    .eq("id", historia)
    .maybeSingle();
  if (!s || s.estado !== "pronta" || !s.revisada_em) return null;
  const [{ data: ultima }, { data: qr }, { data: ligada }] = await Promise.all([
    s.texto
      ? Promise.resolve({ data: null })
      : supabase
          .from("story_versions")
          .select("conteudo")
          .eq("story_id", historia)
          .order("numero", { ascending: false })
          .limit(1)
          .maybeSingle(),
    supabase
      .from("qr_codes")
      .select("codigo, audio_pronto_em, desativado_em")
      .eq("book_id", livro)
      .eq("story_id", historia)
      .maybeSingle(),
    supabase
      .from("story_photos")
      .select("photo_id")
      .eq("book_id", livro)
      .eq("story_id", historia)
      .order("ordem")
      .order("criado_em")
      .limit(1)
      .maybeSingle(),
  ]);
  const texto = normalizarTexto(s.texto ?? ultima?.conteudo ?? null);
  const titulo = (s.texto ? texto.titulo : (s.titulo ?? texto.titulo)) || "";
  const ano = s.texto ? texto.ano : s.ano;
  let foto: ParaAmostra["foto"] = null;
  if (ligada) {
    const { data: f } = await supabase
      .from("photos")
      .select("caminho, largura, altura")
      .eq("book_id", livro)
      .eq("id", ligada.photo_id)
      .maybeSingle();
    if (f) foto = f;
  }
  return {
    titulo: titulo.trim() || "Uma história",
    ano,
    paragrafos: texto.paragrafos.map((p) => p.texto),
    codigo: qr?.codigo ?? null,
    vozPronta: Boolean(qr?.audio_pronto_em),
    desligado: Boolean(qr?.desativado_em),
    foto,
  };
}

/** Bytes da foto (o caminho veio do banco pela sessão, nunca do navegador). */
export async function bytesDaFoto(caminho: string): Promise<Buffer | null> {
  const { data } = await clienteAdmin()
    .storage.from("acervo")
    .download(caminho);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}
