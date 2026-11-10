// Quem pode abrir o quê. Usado pelo proxy.ts, antes de qualquer renderização,
// para que redirect e 404 saiam com o status certo (dentro de <Suspense> sairiam 200).
const PROTEGIDAS = [/^\/$/, /^\/livro(\/|$)/, /^\/admin(\/|$)/];
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
