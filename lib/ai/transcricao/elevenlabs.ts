// ElevenLabs Scribe. Parâmetros conferidos de memória (sites bloqueados na sessão de
// desenvolvimento): se a resposta divergir, o erro aponta o JSON bruto guardado no cache.
import type { Palavra } from "../schemas";
import { exigirOk, type Transcritor } from "./tipos";

type RespostaScribe = {
  words?: {
    text: string;
    start: number;
    end: number;
    type?: string; // "word" | "spacing" | "audio_event"
    speaker_id?: string | null;
    logprob?: number | null;
  }[];
};

export function normalizarScribe(bruto: unknown): Palavra[] {
  const r = bruto as RespostaScribe;
  if (!Array.isArray(r.words)) throw new Error("Scribe: resposta sem 'words'");
  return r.words
    .filter((w) => (w.type ?? "word") === "word" && w.text.trim() !== "")
    .map((w) => ({
      texto: w.text.trim(),
      inicio: w.start,
      fim: w.end,
      falante: w.speaker_id ?? null,
      confianca: typeof w.logprob === "number" ? Math.exp(w.logprob) : null,
    }));
}

export const transcreverScribe: Transcritor = async (audio, nomeArquivo, o) => {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)]), nomeArquivo);
  form.append("model_id", o.modelo);
  form.append("language_code", "por");
  form.append("diarize", "true");
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "false");
  for (const termo of o.dicas.slice(0, 100)) form.append("keyterms", termo);

  const f = o.fetch ?? fetch;
  const resposta = await f("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": o.chave },
    body: form,
  });
  const bruto = await exigirOk(resposta, "ElevenLabs");
  return {
    provedor: "elevenlabs",
    modelo: o.modelo,
    palavras: normalizarScribe(bruto),
    bruto,
  };
};
