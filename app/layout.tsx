import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { MARCA } from "@/lib/config";
import "./globals.css";

// Fonte do conteúdo do livro (textos, capa, prévias). A interface usa a fonte do sistema.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: MARCA,
  description: "Do primeiro áudio ao livro de memórias.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${newsreader.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
