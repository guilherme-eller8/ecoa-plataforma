import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaDividir } from "@/components/telas/tela-dividir";
import { confirmarDivisao } from "@/app/livro/[id]/acoes";
import { divisaoParaConferir } from "@/lib/divisao/dados";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";

export const metadata: Metadata = {
  title: "Confira as histórias · Ecoa Memórias",
};

export default function PaginaDividir({
  params,
}: PageProps<"/livro/[id]/historias/[historiaId]/dividir">) {
  return (
    <Suspense>
      {params.then(({ id, historiaId }) => (
        <Dividir id={id} historiaId={historiaId} />
      ))}
    </Suspense>
  );
}

async function Dividir({ id, historiaId }: { id: string; historiaId: string }) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, divisao] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    divisaoParaConferir(id, historiaId),
  ]);
  if (!divisao) notFound();
  return (
    <TelaDividir
      livro={tela}
      divisao={divisao}
      acoes={{ confirmar: confirmarDivisao.bind(null, id, historiaId) }}
    />
  );
}
