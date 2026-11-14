// O que o proxy faz com o player (seção 5.4 do design). Puro, para testar os 3 hosts.
import { DOMINIO_APP, DOMINIO_QR } from "@/lib/config";

export type DecisaoQr =
  | { tipo: "reescrever"; destino: string }
  | { tipo: "redirecionar"; url: string }
  | { tipo: "nao_encontrado" }
  | { tipo: "servir" } // player num host de prévia, sem sessão
  | null; // não é com o player

const CODIGO_NA_RAIZ = /^\/([2-9A-HJKMNP-Za-hjkmnp-z]{8})\/?$/;

export function decidirQr(host: string, caminho: string): DecisaoQr {
  const h = host.toLowerCase().split(":")[0];
  const doPlayer = caminho === "/ouvir" || caminho.startsWith("/ouvir/");
  if (h === DOMINIO_QR) {
    if (caminho === "/") return { tipo: "reescrever", destino: "/ouvir" };
    const m = caminho.match(CODIGO_NA_RAIZ);
    if (m)
      return { tipo: "reescrever", destino: `/ouvir/${m[1].toUpperCase()}` };
    return { tipo: "nao_encontrado" };
  }
  if (!doPlayer) return null;
  if (h === DOMINIO_APP)
    return {
      tipo: "redirecionar",
      url: `https://${DOMINIO_QR}${caminho.replace(/^\/ouvir/, "") || "/"}`,
    };
  return { tipo: "servir" };
}
