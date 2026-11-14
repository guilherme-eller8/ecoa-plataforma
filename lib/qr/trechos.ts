// Trechos do recorte do QR (seção 5.2 do design). Puro e sem texto: só ids e tempos.
// Dois segmentos seguidos da história viram um trecho só se nenhum segmento de fora da
// história estiver entre eles; a folga nas pontas nunca invade a fala de fora.

export type SegmentoTempo = { id: number; inicio: number; fim: number };
export type Trecho = { inicio: number; fim: number | null }; // fim null = até o fim do arquivo

export const FOLGA_S = 0.25;

const arred = (x: number) => Math.round(x * 1000) / 1000;

export function trechosDaGravacao(
  daHistoria: number[] | null,
  todos: SegmentoTempo[],
  duracaoS: number | null,
): Trecho[] {
  if (daHistoria === null) return [{ inicio: 0, fim: duracaoS }];
  const usar = new Set(daHistoria);
  const ordem = [...todos].sort((a, b) => a.inicio - b.inicio || a.id - b.id);
  const trechos: Trecho[] = [];
  let i = 0;
  while (i < ordem.length) {
    if (!usar.has(ordem[i].id)) {
      i++;
      continue;
    }
    const comeco = i;
    while (i + 1 < ordem.length && usar.has(ordem[i + 1].id)) i++;
    const primeiro = ordem[comeco];
    const ultimo = ordem[i];
    const antes = comeco > 0 ? ordem[comeco - 1] : null;
    const depois = i + 1 < ordem.length ? ordem[i + 1] : null;
    const folgaAntes = antes
      ? Math.max(0, Math.min(FOLGA_S, (primeiro.inicio - antes.fim) / 2))
      : Math.min(FOLGA_S, primeiro.inicio);
    let fim = depois
      ? ultimo.fim +
        Math.max(0, Math.min(FOLGA_S, (depois.inicio - ultimo.fim) / 2))
      : ultimo.fim + FOLGA_S;
    if (duracaoS !== null) fim = Math.min(fim, duracaoS);
    trechos.push({
      inicio: arred(primeiro.inicio - folgaAntes),
      fim: arred(fim),
    });
    i++;
  }
  return trechos;
}

export function duracaoDosTrechos(trechos: Trecho[]): number | null {
  let total = 0;
  for (const t of trechos) {
    if (t.fim === null) return null;
    total += t.fim - t.inicio;
  }
  return arred(total);
}

/** Demuxer forçado pelo tipo do arquivo: nunca deixa o ffmpeg adivinhar (playlist, concat). */
export function demuxerDoTipo(tipo: string | null): string | null {
  const t = (tipo ?? "").split(";")[0].trim().toLowerCase();
  if (
    [
      "audio/mp4",
      "audio/m4a",
      "audio/x-m4a",
      "audio/aac",
      "video/mp4",
    ].includes(t)
  )
    return "mov";
  if (["audio/mpeg", "audio/mp3"].includes(t)) return "mp3";
  if (["audio/ogg", "audio/opus"].includes(t)) return "ogg";
  if (["audio/wav", "audio/x-wav", "audio/wave"].includes(t)) return "wav";
  if (["audio/webm", "video/webm"].includes(t)) return "matroska";
  return null;
}
