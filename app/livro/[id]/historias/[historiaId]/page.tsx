import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaHistoria } from "@/components/telas/tela-historia";
import { historiaParaLer } from "@/lib/historias/dados";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";

export const metadata: Metadata = { title: "História · Ecoa Memórias" };

export default function PaginaHistoria({
  params,
}: PageProps<"/livro/[id]/historias/[historiaId]">) {
  return (
    <Suspense>
      {params.then(({ id, historiaId }) => (
        <Historia id={id} historiaId={historiaId} />
      ))}
    </Suspense>
  );
}

async function Historia({
  id,
  historiaId,
}: {
  id: string;
  historiaId: string;
}) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, historia] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    historiaParaLer(id, historiaId),
  ]);
  if (!historia) notFound();
  return <TelaHistoria livro={tela} historia={historia} />;
}
