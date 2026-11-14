import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { envLinks, type EnvLinks } from "@/lib/env-links";
import { urlDoApp } from "@/lib/env-servidor";

// Token = "v{versao}_" + HMAC(segredo da versão, "{tipo}:{id}") em base64url, 22 caracteres
// (132 bits). Sem ponto: o matcher do proxy exclui caminhos que terminam em ".algo".
// O banco guarda só sha256(token).

// convite, compartilhar e resumo: prompt 11 (T47).
export type TipoLink =
  "familia" | "autor" | "convite" | "compartilhar" | "resumo";
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

/** Início da área do autor. A pergunta é `${urlAutor(token)}/gravar/<id>` (montado na tela). */
export function urlAutor(token: string): string {
  return `${urlDoApp()}/a/${token}`;
}

/** Convite de co-facilitador (P59): o token só apresenta o convite; aceitar é pelo e-mail. */
export function urlConvite(token: string): string {
  return `${urlDoApp()}/convite/${token}`;
}

/** História compartilhada no grupo (P61). */
export function urlCompartilhada(token: string): string {
  return `${urlDoApp()}/o/${token}`;
}

/**
 * Descadastro do resumo semanal (P63): HMAC de "resumo:{membro}". A página pede um toque (GET
 * nunca desliga); /um-clique recebe o POST do List-Unsubscribe-Post (RFC 8058).
 */
export function urlSairDoResumo(membroId: string, env: EnvLinks = envLinks()) {
  const token = tokenDoLink("resumo", membroId, env.versaoAtual, env);
  const pagina = `${urlDoApp()}/resumo/sair/${membroId}/${token}`;
  return { pagina, umClique: `${pagina}/um-clique` };
}

/** Confere o token do descadastro em tempo constante. Versão desconhecida = falso. */
export function tokenDoResumoConfere(
  membroId: string,
  token: string,
  env: EnvLinks = envLinks(),
): boolean {
  const versao = /^v([0-9]{1,2})_/.exec(token)?.[1];
  if (!versao || !env.segredos.has(Number(versao))) return false;
  const esperado = Buffer.from(
    tokenDoLink("resumo", membroId, Number(versao), env),
  );
  const recebido = Buffer.from(token);
  return (
    esperado.length === recebido.length && timingSafeEqual(esperado, recebido)
  );
}
