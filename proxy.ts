import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { envPublico } from "@/lib/env-publico";
import { decidirRota } from "@/lib/rotas";

// Renova a sessão do Supabase a cada requisição e decide redirects e 404 antes de renderizar.
export async function proxy(request: NextRequest) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-z0-9]+$).*)"],
};
