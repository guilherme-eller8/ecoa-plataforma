// Chave de rede do player (T44): HMAC do IP com segredo próprio e a data. O app nunca guarda o IP.
import { createHmac } from "node:crypto";
import { isIPv6 } from "node:net";

/** IP que a Vercel escreve. Nunca o 1º item de um x-forwarded-for vindo do cliente. */
export function ipDaRequisicao(cabecalhos: Headers): string | null {
  const ip =
    cabecalhos.get("x-real-ip")?.trim() ||
    cabecalhos.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  return ip || null;
}

/** IPv6 vira o prefixo /64 (uma casa ou um celular tem o /64 inteiro). */
export function redeDoIp(ip: string): string {
  if (!isIPv6(ip)) return ip;
  const mapeado = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapeado) return mapeado[1];
  const [esq, dir = ""] = ip.toLowerCase().split("::");
  const a = esq ? esq.split(":") : [];
  const b = dir ? dir.split(":") : [];
  const grupos = [...a, ...Array(8 - a.length - b.length).fill("0"), ...b];
  return `${grupos
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

export function chaveDeRede(
  ip: string | null,
  segredo: string,
  agora = new Date(),
): string {
  const dia = agora.toISOString().slice(0, 10);
  return createHmac("sha256", segredo)
    .update(`qr-rede:${ip ? redeDoIp(ip) : "sem-ip"}:${dia}`)
    .digest("hex");
}
