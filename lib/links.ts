import "server-only";
import { createHash, createHmac } from "node:crypto";
import { envLinks, type EnvLinks } from "@/lib/env-links";
import { urlDoApp } from "@/lib/env-servidor";

// Token = "v{versao}_" + HMAC(segredo da versão, "{tipo}:{id}") em base64url, 22 caracteres
// (132 bits). Sem ponto: o matcher do proxy exclui caminhos que terminam em ".algo".
// O banco guarda só sha256(token).

export type TipoLink = "familia" | "autor";
const TAMANHO_HMAC = 22;

export function tokenDoLink(
  tipo: TipoLink,
  id: string,
  versao: number,
  env: EnvLinks = envLinks(),
): string {
  const segredo = env.segredos.get(versao);
  if (!segredo)
    throw new Error(`Sem segredo para a versão ${versao} dos links`);
  const hmac = createHmac("sha256", segredo)
    .update(`${tipo}:${id}`)
    .digest("base64url")
    .slice(0, TAMANHO_HMAC);
  return `v${versao}_${hmac}`;
}

/** O mesmo cálculo de privado.livro_da_familia: sha256 em hexadecimal. */
export function hashDoToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function urlFamilia(token: string): string {
  return `${urlDoApp()}/f/${token}`;
}

// TODO(prompt 5): link pessoal de verdade, derivado de author_access com tokenDoLink("autor", …).
export function linkDoAutor(): string {
  return `${urlDoApp()}/a/em-breve`;
}
