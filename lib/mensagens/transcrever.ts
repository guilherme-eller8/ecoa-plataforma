// Transcrição da mensagem na hora (T48): Scribe sem diarização, com o apelido como dica e corte
// de 45 s. Devolve o bruto (o banco guarda) e o fim da última palavra (a duração real, que o
// banco confere contra o teto). Nenhum texto vai para log (logarSemTexto só registra o tipo).
import { MENSAGEM_TRANSCREVER_TIMEOUT_S } from "@/lib/config";
import type { Transcritor } from "@/lib/ai/transcricao";
import { juntarPalavras } from "./limpar";

export type ResultadoTranscricao =
  { ok: true; bruto: string; fimS: number } | { ok: false };

export async function transcreverAudio(
  audio: Uint8Array,
  nomeArquivo: string,
  apelido: string | null,
  d: {
    transcrever: Transcritor;
    chave: string;
    modelo: string;
    timeoutMs?: number;
  },
): Promise<ResultadoTranscricao> {
  try {
    const r = await d.transcrever(audio, nomeArquivo, {
      chave: d.chave,
      modelo: d.modelo,
      dicas: apelido ? [apelido] : [],
      diarizar: false,
      signal: AbortSignal.timeout(
        d.timeoutMs ?? MENSAGEM_TRANSCREVER_TIMEOUT_S * 1000,
      ),
    });
    const fimS = r.palavras.reduce((m, p) => Math.max(m, p.fim), 0);
    return { ok: true, bruto: juntarPalavras(r.palavras), fimS };
  } catch {
    return { ok: false };
  }
}
