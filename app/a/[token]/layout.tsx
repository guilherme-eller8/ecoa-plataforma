import type { Metadata } from "next";

// Link pessoal do autor: nunca indexado. O proxy.ts também tira o token do Referer.
export const metadata: Metadata = {
  title: "Seu livro · Ecoa Memórias",
  robots: { index: false, follow: false },
};

export default function LayoutAutor({ children }: LayoutProps<"/a/[token]">) {
  return children;
}
