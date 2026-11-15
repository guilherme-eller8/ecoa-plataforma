import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaMontarCapa } from "@/components/telas/tela-montar";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";
import { montagemDaTela } from "@/lib/livro/montar-servidor";
import { acoesDoLivro } from "../../ligar-acoes";
import { acoesDaMontagem } from "../ligar";

export const metadata: Metadata = { title: "Capa do livro · Ecoa Memórias" };

export default function PaginaMontarCapa({
  params,
}: PageProps<"/livro/[id]/montar/capa">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Capa id={id} />
      ))}
    </Suspense>
  );
}

async function Capa({ id }: { id: string }) {
  const a = await livroDaPagina(id);
  const [tela, montagem] = await Promise.all([
    livroDaTela(a.livro, a.podeEscrever),
    montagemDaTela(a),
  ]);
  if (!montagem) notFound();
  return (
    <TelaMontarCapa
      key={`${montagem.rev}-${montagem.hash}`}
      livro={tela}
      montagem={montagem}
      acoes={acoesDaMontagem(id)}
      fotos={acoesDoLivro(id).fotos}
    />
  );
}
