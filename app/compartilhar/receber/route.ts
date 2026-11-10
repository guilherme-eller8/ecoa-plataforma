import { NextResponse, type NextRequest } from "next/server";

// Só chega aqui se o service worker ainda não estava instalado (primeira vez no aparelho):
// os arquivos não ficam guardados, e a página explica o que fazer.
export function POST(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/compartilhar?erro=1", request.url),
    303,
  );
}
