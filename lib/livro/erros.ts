// Erro de montagem com código fixo. A mensagem do Typst, do mupdf e do sharp pode citar o texto
// da família: o detalhe vai só para o log do servidor, nunca para o Inngest (T36).
export type CodigoErroLivro =
  | "falhou_typst"
  | "falhou_foto"
  | "falhou_pdf"
  | "falhou_upload"
  | "qr_nao_conferido"
  | "titulo_capa_longo"
  | "export_indisponivel"
  | "falhou_montar";

export class ErroLivro extends Error {
  constructor(readonly codigo: CodigoErroLivro) {
    super(codigo);
    this.name = "ErroLivro";
  }
}

/** Qualquer exceção vira só o código; o que a causou fica no log do servidor, sem a mensagem. */
export function comoErroLivro(e: unknown, padrao: CodigoErroLivro): ErroLivro {
  if (e instanceof ErroLivro) return e;
  console.error(`[livro] ${padrao}`, e instanceof Error ? e.name : typeof e);
  return new ErroLivro(padrao);
}
