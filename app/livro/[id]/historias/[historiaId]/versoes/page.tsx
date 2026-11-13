import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaVersoes } from "@/components/telas/tela-versoes";
import { restaurar } from "@/app/livro/[id]/historias/editor-acoes";
import { versoesDaHistoria } from "@/lib/historias/dados";
import { livroDaPagina } from "@/lib/livro/acesso";

export const metadata: Metadata = { title: "Histórico · Ecoa Memórias" };

export default function PaginaVersoes({
  params,
}: PageProps<"/livro/[id]/historias/[historiaId]/versoes">) {
  return (
    <Suspense>
      {params.then(({ id, historiaId }) => (
        <Versoes id={id} historiaId={historiaId} />
      ))}
    </Suspense>
  );
}

async function Versoes({ id, historiaId }: { id: string; historiaId: string }) {
  const { usuario, podeEscrever } = await livroDaPagina(id);
  const dados = await versoesDaHistoria(id, historiaId, usuario.id);
  if (!dados) notFound();
  return (
    <TelaVersoes
      livroId={id}
      historiaId={historiaId}
      titulo={dados.titulo}
      atual={dados.atual}
      versoes={dados.versoes}
      podeEscrever={podeEscrever}
      acoes={{ restaurar: restaurar.bind(null, id, historiaId) }}
    />
  );
}
