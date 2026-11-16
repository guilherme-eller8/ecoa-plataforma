import "server-only";
// T56: gravação sem duração (um .webm sem esse dado no cabeçalho) ficava como "Guardada" para
// sempre: o banco não começa uma história sem saber quanto da cota ela gasta. Aqui o servidor
// mede com o ffmpeg (cópia do áudio, sem decodificar: segundos mesmo para 2 h) e grava.
// O ffmpeg é o endurecido do QR (T45): só arquivo local, demuxer forçado pelo tipo.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { caminhoFfmpeg } from "@/lib/audio/ffmpeg";
import { demuxerDoTipo } from "@/lib/qr/trechos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { logarSemTexto } from "./erros";

const TEMPO_MAX_MS = 120_000;

export function argumentosDaMedida(arquivo: string, demuxer: string) {
  return [
    ...["-hide_banner", "-nostdin", "-loglevel", "error"],
    ...["-protocol_whitelist", "file", "-f", demuxer, "-i", arquivo],
    ...[
      "-map",
      "0:a:0",
      "-c",
      "copy",
      "-progress",
      "pipe:1",
      "-f",
      "null",
      "-",
    ],
  ];
}

/** Segundos do último `out_time_us` do -progress; null se não deu para ler. */
export function duracaoDoProgresso(progresso: string): number | null {
  const us = [...progresso.matchAll(/out_time_us=(\d+)/g)].pop()?.[1];
  const s = us ? Number(us) / 1e6 : NaN;
  return Number.isFinite(s) && s > 0 ? s : null;
}

function medir(arquivo: string, demuxer: string): Promise<number | null> {
  return new Promise((resolve) => {
    const proc = spawn(caminhoFfmpeg(), argumentosDaMedida(arquivo, demuxer), {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let progresso = "";
    const limite = setTimeout(() => proc.kill("SIGKILL"), TEMPO_MAX_MS);
    proc.stdout.on("data", (d: Buffer) => (progresso += d.toString()));
    proc.stderr.resume(); // a mensagem do ffmpeg pode citar caminhos: não guarda
    proc.on("error", () => {
      clearTimeout(limite);
      resolve(null);
    });
    proc.on("close", (codigo) => {
      clearTimeout(limite);
      resolve(codigo === 0 ? duracaoDoProgresso(progresso) : null);
    });
  });
}

/**
 * Mede e grava a duração de uma gravação recebida que chegou sem ela. Nunca lança: se não
 * der, a gravação segue "Guardada" e o alerta de fila parada avisa o admin.
 */
export async function medirSeFaltar(gravacao: string): Promise<number | null> {
  const db = clienteAdmin();
  const { data: g } = await db
    .from("recordings")
    .select("duracao_s, caminho, content_type, upload")
    .eq("id", gravacao)
    .maybeSingle();
  if (!g || g.duracao_s != null || g.upload !== "recebido" || !g.caminho)
    return g?.duracao_s ?? null;
  const demuxer = demuxerDoTipo(g.content_type);
  if (!demuxer) return null;
  const arquivo = join(tmpdir(), `medir-${randomUUID()}`);
  try {
    const { data, error } = await db.storage.from("audios").download(g.caminho);
    if (error || !data) return null;
    await writeFile(arquivo, new Uint8Array(await data.arrayBuffer()));
    const s = await medir(arquivo, demuxer);
    if (s === null) return null;
    const duracao = Math.max(1, Math.round(s));
    await db
      .from("recordings")
      .update({ duracao_s: duracao })
      .eq("id", gravacao)
      .is("duracao_s", null);
    return duracao;
  } catch (e) {
    logarSemTexto("medir duracao", e);
    return null;
  } finally {
    await rm(arquivo, { force: true }).catch(() => undefined);
  }
}
