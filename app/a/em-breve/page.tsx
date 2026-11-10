import type { Metadata } from "next";
import { MarcaEcoa } from "@/components/ui/marca";

export const metadata: Metadata = {
  title: "Seu livro · Ecoa Memórias",
  robots: { index: false },
};

// TODO(prompt 5): o link pessoal do autor substitui esta página.
export default function EmBreve() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pt-10">
      <MarcaEcoa />
      <h1 className="font-livro text-livro-36 text-tinta leading-tight">
        Seu link chega em breve.
      </h1>
      <p className="text-ui-17 text-tinta-2">
        Quem está fazendo o seu livro vai te mandar.
      </p>
    </main>
  );
}
