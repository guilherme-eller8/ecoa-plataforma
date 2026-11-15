// Nome do evento da geração dos PDFs, sem puxar Typst, mupdf e sharp para quem só envia (a ação
// Publicar). O evento leva só o id da versão (T36): nunca texto do livro.
export const EVENTO_LIVRO_EXPORTAR = "livro/exportar";

export function pastaDaVersao(livro: string, versao: number, sufixo: string) {
  return `livros/${livro}/v${versao}-${sufixo}`;
}
