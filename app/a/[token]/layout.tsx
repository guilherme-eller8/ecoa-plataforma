import type { Metadata } from "next";

// Link pessoal do autor: nunca indexado (o proxy.ts também tira o token do Referer) e com
// manifest próprio, para o atalho da tela inicial abrir o link dele.
export async function generateMetadata({
  params,
}: LayoutProps<"/a/[token]">): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Seu livro · Ecoa Memórias",
    robots: { index: false, follow: false },
    manifest: `/a/${encodeURIComponent(token)}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: "Meu livro" },
  };
}

export default function LayoutAutor({ children }: LayoutProps<"/a/[token]">) {
  return children;
}
