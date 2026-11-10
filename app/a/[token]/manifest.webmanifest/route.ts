import { NextResponse } from "next/server";
import { tokenValido } from "@/lib/links-formato";

// O autor salva o link na tela inicial (M7). Sem este manifest próprio, o atalho abriria "/"
// (que pede login). O token já está no endereço que ele abriu; aqui só vira o ponto de partida.
export async function GET(
  _: Request,
  { params }: RouteContext<"/a/[token]/manifest.webmanifest">,
) {
  const { token } = await params;
  if (!tokenValido.safeParse(token).success)
    return new NextResponse(null, { status: 404 });
  return NextResponse.json(
    {
      name: "Meu livro · Ecoa",
      short_name: "Meu livro",
      start_url: `/a/${token}`,
      scope: `/a/${token}`,
      display: "standalone",
      background_color: "#f5efe4",
      theme_color: "#f5efe4",
      lang: "pt-BR",
      icons: [
        { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/icones/icone-mascara-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
