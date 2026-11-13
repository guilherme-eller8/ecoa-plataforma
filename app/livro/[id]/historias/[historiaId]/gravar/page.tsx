import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaGravarMais } from "@/components/telas/tela-gravar-mais";
import { historiaParaGravarMais } from "@/lib/historias/dados";
import { livroDaPagina } from "@/lib/livro/acesso";
import { acoesDoLivro } from "../../../ligar-acoes";

export const metadata: Metadata = { title: "Gravar mais · Ecoa Memórias" };

// Prompt 9: "Gravar mais sobre isso". A gravação vai para a mesma história, como proposta.
export default function PaginaGravarMais({
  params,
}: PageProps<"/livro/[id]/historias/[historiaId]/gravar">) {
  return (
    <Suspense>
      {params.then(({ id, historiaId }) => (
        <GravarMais id={id} historiaId={historiaId} />
      ))}
    </Suspense>
  );
}

async function GravarMais({
  id,
  historiaId,
}: {
  id: string;
  historiaId: string;
}) {
  const { podeEscrever } = await livroDaPagina(id);
  const historia = await historiaParaGravarMais(id, historiaId);
  if (!historia) notFound();
  return (
    <TelaGravarMais
      livroId={id}
      historia={historia}
      podeEscrever={podeEscrever}
      acoes={acoesDoLivro(id).audios}
    />
  );
}
