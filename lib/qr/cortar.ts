// ffmpeg endurecido para o recorte do QR (T45). Entrada: arquivos locais já baixados, com o
// demuxer forçado. Saída: .m4a (AAC mono) sem metadados, capítulos nem capa.
import { spawn } from "node:child_process";
import { caminhoFfmpeg } from "@/lib/audio/ffmpeg";
import { QR_AUDIO_KBPS } from "@/lib/config";
import type { Trecho } from "./trechos";

export type EntradaCorte = { arquivo: string; demuxer: string; trecho: Trecho };

const FADE_S = 0.05;
const TEMPO_MAX_MS = 240_000;

export function argumentosDoCorte(
  entradas: EntradaCorte[],
  saida: string,
): string[] {
  const args = ["-hide_banner", "-nostdin", "-y", "-loglevel", "error"];
  for (const e of entradas) {
    args.push("-protocol_whitelist", "file", "-f", e.demuxer);
    args.push("-ss", e.trecho.inicio.toFixed(3));
    if (e.trecho.fim !== null) args.push("-to", e.trecho.fim.toFixed(3));
    args.push("-i", e.arquivo);
  }
  const filtros = entradas.map((e, i) => {
    const dur = e.trecho.fim === null ? null : e.trecho.fim - e.trecho.inicio;
    const saidaFade =
      dur && dur > FADE_S * 2
        ? `,afade=t=out:st=${(dur - FADE_S).toFixed(3)}:d=${FADE_S}`
        : "";
    return `[${i}:a:0]aresample=44100,aformat=channel_layouts=mono,afade=t=in:d=${FADE_S}${saidaFade}[a${i}]`;
  });
  const rotulos = entradas.map((_, i) => `[a${i}]`).join("");
  filtros.push(`${rotulos}concat=n=${entradas.length}:v=0:a=1[saida]`);
  args.push(
    "-filter_complex",
    filtros.join(";"),
    "-map",
    "[saida]",
    "-vn",
    "-sn",
    "-dn",
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-c:a",
    "aac",
    "-b:a",
    `${QR_AUDIO_KBPS}k`,
    "-ac",
    "1",
    "-movflags",
    "+faststart",
    "-progress",
    "pipe:1",
    "-f",
    "mp4",
    saida,
  );
  return args;
}

/** Corta e devolve a duração medida da saída (do -progress do ffmpeg), em segundos. */
export function cortar(
  entradas: EntradaCorte[],
  saida: string,
): Promise<number> {
  if (!entradas.length) return Promise.reject(new Error("recorte:sem_trechos"));
  return new Promise((resolve, reject) => {
    const proc = spawn(caminhoFfmpeg(), argumentosDoCorte(entradas, saida), {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let progresso = "";
    const limite = setTimeout(() => proc.kill("SIGKILL"), TEMPO_MAX_MS);
    proc.stdout.on("data", (d: Buffer) => (progresso += d.toString()));
    proc.stderr.resume(); // a mensagem do ffmpeg pode citar caminhos: não guarda
    proc.on("error", () => {
      clearTimeout(limite);
      reject(new Error("recorte:sem_ffmpeg"));
    });
    proc.on("close", (codigo) => {
      clearTimeout(limite);
      if (codigo !== 0) return reject(new Error("recorte:ffmpeg_falhou"));
      const us = [...progresso.matchAll(/out_time_us=(\d+)/g)].pop()?.[1];
      const s = us ? Number(us) / 1e6 : NaN;
      if (!Number.isFinite(s) || s <= 0)
        return reject(new Error("recorte:duracao_desconhecida"));
      resolve(Math.round(s * 100) / 100);
    });
  });
}
