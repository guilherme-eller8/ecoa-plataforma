import "server-only";
import { z } from "zod";

// Segredo da chave de rede do player do QR (T44). Separado dos links: se um vazar, o outro não cai.
// Trocar o valor só zera os contadores do dia; não quebra nenhum QR impresso.
const esquema = z
  .string({ error: "Falta QR_REDE_SEGREDO no .env.local" })
  .min(32, "QR_REDE_SEGREDO precisa de 32 caracteres ou mais");

export function segredoDaRede(
  env: Record<string, string | undefined> = process.env,
): string {
  return esquema.parse(env.QR_REDE_SEGREDO);
}
