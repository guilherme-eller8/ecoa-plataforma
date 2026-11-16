// Caminho do ffmpeg: o binário do pacote ffmpeg-static (na Vercel, incluído no pacote da função do
// Inngest por outputFileTracingIncludes) ou, sem ele, o do sistema. Usado pelo lab e pelo QR.
//
// Primeiro o caminho direto do binário: na Vercel o tracing leva só o arquivo `ffmpeg` (o
// require dinâmico do pacote não é visto pelo tracing, então o index.js dele não vai junto e o
// require falhava em produção, caindo num "ffmpeg" do sistema que lá não existe).
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

export function caminhoFfmpeg(): string {
  const direto = join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
  if (existsSync(direto)) return direto;
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
