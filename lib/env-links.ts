import "server-only";
import { z } from "zod";

// Segredos dos links sem login (família agora; autor no prompt 5). Separado de envServidor()
// para que faltar o segredo não derrube o admin nem o e-mail.
// NUNCA edite o valor de uma versão existente: os links fixados nos grupos param.
// Para trocar o segredo, crie LINKS_SEGREDO_V2 e mude LINKS_VERSAO_ATUAL para 2.

const segredo = z
  .string({ error: "Falta um LINKS_SEGREDO_V{n} no .env.local" })
  .min(32, "LINKS_SEGREDO_V{n} precisa de 32 caracteres ou mais");

export type EnvLinks = { versaoAtual: number; segredos: Map<number, string> };

export function envLinks(
  env: Record<string, string | undefined> = process.env,
): EnvLinks {
  const versaoAtual = z.coerce
    .number()
    .int()
    .min(1)
    .max(99)
    .parse(env.LINKS_VERSAO_ATUAL ?? "1");
  const segredos = new Map<number, string>();
  for (let v = 1; v <= versaoAtual; v++) {
    segredos.set(v, segredo.parse(env[`LINKS_SEGREDO_V${v}`]));
  }
  return { versaoAtual, segredos };
}
