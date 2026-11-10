// Cache só da transcrição: é a etapa lenta e paga por minuto.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Transcricao } from "@/lib/ai/schemas";

export function chaveTranscricao(
  audio: Uint8Array,
  provedor: string,
  modelo: string,
  dicas: string[],
): string {
  const h = createHash("sha256");
  h.update(audio).update(
    `|${provedor}|${modelo}|${[...dicas].sort().join(",")}`,
  );
  return h.digest("hex").slice(0, 32);
}

export function lerCache(dir: string, chave: string): Transcricao | null {
  const arquivo = join(dir, `${chave}.json`);
  return existsSync(arquivo)
    ? (JSON.parse(readFileSync(arquivo, "utf8")) as Transcricao)
    : null;
}

export function gravarCache(
  dir: string,
  chave: string,
  t: Transcricao,
): string {
  mkdirSync(dir, { recursive: true });
  const arquivo = join(dir, `${chave}.json`);
  writeFileSync(arquivo, JSON.stringify(t, null, 2));
  return arquivo;
}
