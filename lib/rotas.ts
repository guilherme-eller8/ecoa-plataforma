// Quem pode abrir o quê. Usado pelo proxy.ts, antes de qualquer renderização,
// para que redirect e 404 saiam com o status certo (dentro de <Suspense> sairiam 200).
const PROTEGIDAS = [
  /^\/$/,
  /^\/livro(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/compartilhar$/, // a página; o POST do share_target (/compartilhar/receber) não pede login
];
const SO_ADMIN = /^\/admin(\/|$)/;

export type Sessao = { temSessao: boolean; ehAdmin: boolean };
export type Decisao =
  { tipo: "redirect"; destino: string } | { tipo: "nao_encontrado" } | null;

export function decidirRota(
  caminho: string,
  { temSessao, ehAdmin }: Sessao,
): Decisao {
  if (!temSessao && PROTEGIDAS.some((r) => r.test(caminho)))
    return { tipo: "redirect", destino: "/entrar" };
  if (temSessao && !ehAdmin && SO_ADMIN.test(caminho))
    return { tipo: "nao_encontrado" };
  if (temSessao && caminho === "/entrar")
    return { tipo: "redirect", destino: "/" };
  return null;
}

// Páginas com token na URL (prompt 11, T47): sem cache, sem índice e sem Referer.
const PRIVADAS = [/^\/convite\//, /^\/o\//, /^\/resumo\/sair\//];

export function ehPaginaComToken(caminho: string): boolean {
  return PRIVADAS.some((r) => r.test(caminho));
}

export const CABECALHOS_PRIVADOS: Record<string, string> = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
