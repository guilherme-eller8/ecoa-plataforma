import { transcreverAssembly } from "./assemblyai";
import { transcreverScribe } from "./elevenlabs";
import type { Transcritor } from "./tipos";

export const TRANSCRITORES: Record<
  string,
  { transcrever: Transcritor; variavelChave: string }
> = {
  elevenlabs: {
    transcrever: transcreverScribe,
    variavelChave: "ELEVENLABS_API_KEY",
  },
  assemblyai: {
    transcrever: transcreverAssembly,
    variavelChave: "ASSEMBLYAI_API_KEY",
  },
};

export type { OpcoesTranscricao, Transcritor } from "./tipos";
