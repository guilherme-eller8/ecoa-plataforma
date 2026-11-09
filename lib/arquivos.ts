// Caminhos de arquivo no Storage. As regex são as mesmas dos CHECKs do banco: o servidor
// confere antes de assinar, para nunca assinar um caminho de outro livro ("..", "%2e" etc.).

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ehUuid = (s: string) => new RegExp(`^${UUID}$`).test(s);

export type TipoAudio = "webm" | "m4a" | "ogg";

export function caminhoFoto(livro: string, id: string = crypto.randomUUID()) {
  return `livros/${livro}/acervo/${id}.jpg`;
}

export function fotoDoLivro(caminho: string, livro: string): boolean {
  return (
    ehUuid(livro) &&
    new RegExp(`^livros/${livro}/acervo/${UUID}\\.jpg$`).test(caminho)
  );
}

export function audioDoCauso(
  caminho: string,
  livro: string,
  causo: string,
): boolean {
  return (
    ehUuid(livro) &&
    ehUuid(causo) &&
    new RegExp(`^livros/${livro}/causos/${causo}\\.(webm|m4a|ogg)$`).test(
      caminho,
    )
  );
}

/** Tipo de arquivo do gravador → extensão e content-type (sem ";codecs="). */
export function tipoDoAudio(
  mime: string,
): { ext: TipoAudio; contentType: string } | null {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base === "audio/webm") return { ext: "webm", contentType: "audio/webm" };
  if (base === "audio/mp4" || base === "audio/x-m4a" || base === "audio/aac")
    return { ext: "m4a", contentType: "audio/mp4" };
  if (base === "audio/ogg") return { ext: "ogg", contentType: "audio/ogg" };
  return null;
}
