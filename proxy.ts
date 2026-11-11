import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { envPublico } from "@/lib/env-publico";
import {
  APARELHO_DURA_S,
  COOKIE_APARELHO,
  aparelhoValido,
} from "@/lib/familia/aparelho";
import { decidirRota } from "@/lib/rotas";

// Link da família: sem sessão nem chamada ao Supabase. Grava o cookie do aparelho na
// requisição (a página já o lê no primeiro acesso) e na resposta, e pede para não indexar
// nem vazar o token pelo Referer.
function proxyFamilia(request: NextRequest) {
  const atual = request.cookies.get(COOKIE_APARELHO)?.value;
  const valor = aparelhoValido(atual) ? atual : crypto.randomUUID();
  if (valor !== atual) request.cookies.set(COOKIE_APARELHO, valor);
  const resposta = NextResponse.next({ request });
  if (valor !== atual)
    resposta.cookies.set(COOKIE_APARELHO, valor, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: APARELHO_DURA_S,
      path: "/f",
    });
  resposta.headers.set("Referrer-Policy", "no-referrer");
  resposta.headers.set("X-Robots-Tag", "noindex, nofollow");
  return resposta;
}

// Link do autor: sem sessão nem chamada ao Supabase (quem abre não tem login). O token fica
// fora do Referer e da indexação.
function proxyAutor(request: NextRequest) {
  const resposta = NextResponse.next({ request });
  resposta.headers.set("Referrer-Policy", "no-referrer");
  resposta.headers.set("X-Robots-Tag", "noindex, nofollow");
  return resposta;
}

// Renova a sessão do Supabase a cada requisição e decide redirects e 404 antes de renderizar.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/f/")) return proxyFamilia(request);
  if (request.nextUrl.pathname.startsWith("/a/")) return proxyAutor(request);

  let resposta = NextResponse.next({ request });
  const env = envPublico();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (paraGravar, cabecalhos) => {
          for (const { name, value } of paraGravar)
            request.cookies.set(name, value);
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of paraGravar)
            resposta.cookies.set(name, value, options);
          for (const [chave, valor] of Object.entries(cabecalhos ?? {}))
            resposta.headers.set(chave, valor);
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const decisao = decidirRota(request.nextUrl.pathname, {
    temSessao: Boolean(claims?.sub),
    ehAdmin: claims?.app_metadata?.role === "admin",
  });

  if (!decisao) return resposta;

  const final =
    decisao.tipo === "redirect"
      ? NextResponse.redirect(new URL(decisao.destino, request.url))
      : NextResponse.rewrite(new URL("/nao-encontrado", request.url), {
          status: 404,
        });
  // Leva junto os cookies de sessão renovados.
  for (const cookie of resposta.cookies.getAll()) final.cookies.set(cookie);
  return final;
}

export const config = {
  // /f/ e /a/ explícitos: um token nunca pode cair na exclusão de arquivos estáticos.
  matcher: [
    "/f/:path*",
    "/a/:path*",
    // /api/inngest fica de fora: o Inngest chama a rota a cada passo, sem sessão.
    "/((?!_next/static|_next/image|api/inngest|favicon.ico|.*\\.[a-z0-9]+$).*)",
  ],
};
