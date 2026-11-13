import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaKit } from "@/components/telas/tela-kit";
import { livroDaPagina } from "@/lib/livro/acesso";
import { linkDaFamilia, linkDoAutor, livroDaTela } from "@/lib/livro/dados";
import { acoesDoLivro } from "../ligar-acoes";

export const metadata: Metadata = { title: "Chame a família · Ecoa Memórias" };

export default function PaginaKit({ params }: PageProps<"/livro/[id]/kit">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Kit id={id} />
      ))}
    </Suspense>
  );
}

async function Kit({ id }: { id: string }) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, link, autor] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    linkDaFamilia(id),
    linkDoAutor(id),
  ]);
  return (
    <TelaKit
      livro={tela}
      linkFamilia={link}
      linkAutor={autor}
      acoes={acoesDoLivro(id).kit}
    />
  );
}
