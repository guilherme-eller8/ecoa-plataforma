import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { TelaAderenciaLivro } from "@/components/telas/tela-aderencia-livro";
import { carregarLivro } from "@/lib/aderencia/dados";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = {
  title: "Livro · Aderência · Admin",
  robots: { index: false },
};

export default function PaginaAderenciaLivro({
  params,
}: PageProps<"/admin/aderencia/[livro]">) {
  return (
    <Suspense>
      {params.then(({ livro }) => (
        <AderenciaLivro id={livro} />
      ))}
    </Suspense>
  );
}

async function AderenciaLivro({ id }: { id: string }) {
  const usuario = await usuarioAtual();
  if (!usuario?.ehAdmin) notFound();
  if (!z.uuid().safeParse(id).success) notFound();
  const dados = await carregarLivro(id);
  if (!dados) notFound();
  return (
    <TelaAderenciaLivro
      autorNome={dados.livro.autorNome}
      email={dados.livro.email}
      linha={dados.linha}
      pessoas={dados.pessoas}
      linhaDoTempo={dados.linhaDoTempo}
    />
  );
}
