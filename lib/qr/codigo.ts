// Código do QR (T44): 8 símbolos de QR_ALFABETO. Puro: roda no proxy, no servidor e na tela.
import {
  DOMINIO_QR,
  QR_ALFABETO,
  QR_TAMANHO_CODIGO,
  QR_URL_MAIUSCULA,
} from "@/lib/config";

const VALIDO = new RegExp(`^[${QR_ALFABETO}]{${QR_TAMANHO_CODIGO}}$`);
const PROIBIDAS = /[01IOL]/;

export function codigoValido(codigo: string): boolean {
  return VALIDO.test(codigo);
}

export type CodigoDigitado =
  | { ok: true; codigo: string }
  | { ok: false; motivo: "vazio" | "letra_proibida" | "tamanho" };

/** O que a pessoa digitou: maiúsculas, sem espaço nem hífen. Não troca letra nenhuma. */
export function normalizarCodigo(entrada: string): CodigoDigitado {
  const limpo = entrada.toUpperCase().replace(/[\s\-–.]/g, "");
  if (!limpo) return { ok: false, motivo: "vazio" };
  if (PROIBIDAS.test(limpo)) return { ok: false, motivo: "letra_proibida" };
  if (!codigoValido(limpo)) return { ok: false, motivo: "tamanho" };
  return { ok: true, codigo: limpo };
}

/** Como vai impresso embaixo do QR: dois grupos de 4. */
export function codigoImpresso(codigo: string): string {
  return `${codigo.slice(0, 4)} ${codigo.slice(4)}`;
}

/** O que o QR codifica. Maiúsculo cabe no modo alfanumérico do QR (versão 3 em vez de 4). */
export function urlDoQr(codigo: string, maiuscula = QR_URL_MAIUSCULA): string {
  const url = `https://${DOMINIO_QR}/${codigo}`;
  return maiuscula ? url.toUpperCase() : url;
}
