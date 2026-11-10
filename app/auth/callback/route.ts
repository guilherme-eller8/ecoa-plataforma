import { NextResponse, type NextRequest } from "next/server";
import { clienteSessao } from "@/lib/supabase/servidor";

// Volta do Google. Aceita só `code`: o destino é sempre "/", sem parâmetro de redirect.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const para = (caminho: string) =>
    NextResponse.redirect(new URL(caminho, url.origin));

  // Cadastro desligado: e-mail Google sem conta criada pelo admin.
  if (url.searchParams.get("error_code") === "signup_disabled")
    return para("/entrar?erro=sem_livro");

  const code = url.searchParams.get("code");
  if (!code) return para("/entrar?erro=falhou");

  const supabase = await clienteSessao();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return para("/entrar?erro=falhou");
  return para("/");
}
