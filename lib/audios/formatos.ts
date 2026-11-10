// Formatos de áudio aceitos no upload (prompt 5A). Puro: roda no navegador, no servidor e nos testes.
// O formato vem da extensão, porque o tipo que o celular informa não é confiável
// (o iPhone manda .opus sem tipo nenhum).
import { FORMATOS_AUDIO, MAX_AUDIO_MB } from "@/lib/config";

export type FormatoAudio = (typeof FORMATOS_AUDIO)[number];

const CONTENT_TYPE: Record<FormatoAudio, string> = {
  opus: "audio/ogg",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  webm: "audio/webm",
};

export const MAX_AUDIO_BYTES = MAX_AUDIO_MB * 1024 * 1024;

/** Valor do atributo accept do seletor de arquivos. */
export const ACEITA_AUDIO = [
  "audio/*",
  ...FORMATOS_AUDIO.map((f) => `.${f}`),
].join(",");

export function formatoDoArquivo(
  nome: string,
): { ext: FormatoAudio; contentType: string } | null {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  if (
    !(FORMATOS_AUDIO as readonly string[]).includes(ext) ||
    !nome.includes(".")
  )
    return null;
  const formato = ext as FormatoAudio;
  return { ext: formato, contentType: CONTENT_TYPE[formato] };
}

/** Frase clara para um arquivo que não pode subir; null se pode. */
export function recusa(arquivo: { name: string; size: number }): string | null {
  if (!formatoDoArquivo(arquivo.name))
    return `«${arquivo.name}» não é áudio. Use .opus, .m4a, .mp3, .ogg, .wav ou .webm.`;
  if (arquivo.size > MAX_AUDIO_BYTES)
    return `«${arquivo.name}» passa de ${MAX_AUDIO_MB} MB e não pode subir.`;
  if (arquivo.size === 0) return `«${arquivo.name}» está vazio.`;
  return null;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function caminhoAudio(livro: string, id: string, ext: FormatoAudio) {
  return `livros/${livro}/audios/${id}.${ext}`;
}

/** Mesma regra do CHECK recordings_caminho_do_livro: o servidor confere antes de assinar. */
export function audioDoLivro(caminho: string, livro: string, id: string) {
  return (
    new RegExp(`^${UUID}$`).test(livro) &&
    new RegExp(`^${UUID}$`).test(id) &&
    new RegExp(
      `^livros/${livro}/audios/${id}\\.(${FORMATOS_AUDIO.join("|")})$`,
    ).test(caminho)
  );
}

/** "3 min 05 s", "48 s", "1 h 02 min". */
export function formatarDuracao(segundos: number | null): string | null {
  if (segundos == null || !Number.isFinite(segundos) || segundos <= 0)
    return null;
  const s = Math.round(segundos);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m) return `${m} min ${String(r).padStart(2, "0")} s`;
  return `${r} s`;
}

/** "2,4 MB", "830 KB". */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
