// Caminho do ffmpeg: o do pacote ffmpeg-static (na Vercel, incluído no pacote da função do
// Inngest por outputFileTracingIncludes) ou, sem ele, o do sistema. Usado pelo lab e pelo QR.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

export function caminhoFfmpeg(): string {
  try {
    const estatico = createRequire(join(process.cwd(), "package.json"))(
      "ffmpeg-static",
    ) as string | null;
    if (estatico && existsSync(estatico)) return estatico;
  } catch {
    // sem ffmpeg-static: tenta o do sistema
  }
  return "ffmpeg";
}
