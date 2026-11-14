// Normaliza o áudio (FLAC mono 16 kHz) e mede a duração. Fica fora de lib/ai de propósito:
// na plataforma, o ffmpeg vem do serviço de fila.
import { spawn } from "node:child_process";
import { caminhoFfmpeg } from "../../lib/audio/ffmpeg";

export const EXTENSOES_AUDIO = [
  ".opus",
  ".ogg",
  ".m4a",
  ".mp3",
  ".wav",
  ".webm",
  ".flac",
];

export async function normalizarAudio(
  entrada: string,
): Promise<{ audio: Buffer; minutos: number }> {
  const ffmpeg = caminhoFfmpeg();
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, [
      "-hide_banner",
      "-i",
      entrada,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "flac",
      "pipe:1",
    ]);
    const partes: Buffer[] = [];
    let erro = "";
    proc.stdout.on("data", (d: Buffer) => partes.push(d));
    proc.stderr.on("data", (d: Buffer) => (erro += d.toString()));
    proc.on("error", () =>
      reject(
        new Error(
          "ffmpeg não encontrado. Rode `npm install` de novo (instala o ffmpeg-static) ou instale o ffmpeg no sistema.",
        ),
      ),
    );
    proc.on("close", (codigo) => {
      if (codigo !== 0)
        return reject(
          new Error(`ffmpeg falhou em ${entrada}: ${erro.slice(-300)}`),
        );
      const m = erro.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      const minutos = m
        ? Number(m[1]) * 60 + Number(m[2]) + Number(m[3]) / 60
        : 0;
      resolve({ audio: Buffer.concat(partes), minutos });
    });
  });
}
