// AssemblyAI: upload → criar transcrição → consultar até ficar pronta.
import type { Palavra } from "../schemas";
import { exigirOk, type Transcritor } from "./tipos";

const BASE = "https://api.assemblyai.com/v2";

type RespostaAssembly = {
  status?: string;
  error?: string;
  words?: {
    text: string;
    start: number;
    end: number;
    confidence?: number;
    speaker?: string | null;
  }[];
};

export function normalizarAssembly(bruto: unknown): Palavra[] {
  const r = bruto as RespostaAssembly;
  if (!Array.isArray(r.words))
    throw new Error("AssemblyAI: resposta sem 'words'");
  return r.words.map((w) => ({
    texto: w.text,
    inicio: w.start / 1000,
    fim: w.end / 1000,
    falante: w.speaker ?? null,
    confianca: w.confidence ?? null,
  }));
}

export const transcreverAssembly: Transcritor = async (audio, _nome, o) => {
  const f = o.fetch ?? fetch;
  const auth = { authorization: o.chave };

  const upload = (await exigirOk(
    await f(`${BASE}/upload`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/octet-stream" },
      body: new Uint8Array(audio),
    }),
    "AssemblyAI (upload)",
  )) as { upload_url: string };

  const criado = (await exigirOk(
    await f(`${BASE}/transcript`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({
        audio_url: upload.upload_url,
        language_code: "pt",
        speech_model: o.modelo,
        speaker_labels: true,
        ...(o.dicas.length ? { keyterms_prompt: o.dicas.slice(0, 100) } : {}),
      }),
    }),
    "AssemblyAI (criar)",
  )) as { id: string };

  const limite = Date.now() + 15 * 60_000;
  while (Date.now() < limite) {
    const bruto = (await exigirOk(
      await f(`${BASE}/transcript/${criado.id}`, { headers: auth }),
      "AssemblyAI (consultar)",
    )) as RespostaAssembly;
    if (bruto.status === "completed") {
      return {
        provedor: "assemblyai",
        modelo: o.modelo,
        palavras: normalizarAssembly(bruto),
        bruto,
      };
    }
    if (bruto.status === "error")
      throw new Error(`AssemblyAI: ${bruto.error ?? "erro sem detalhe"}`);
    await new Promise((r) => setTimeout(r, o.esperarMs ?? 3000));
  }
  throw new Error("AssemblyAI: passou de 15 minutos sem terminar");
};
