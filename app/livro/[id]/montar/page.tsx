import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaMontarConteudo } from "@/components/telas/tela-montar";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";
import { montagemDaTela } from "@/lib/livro/montar-servidor";
import { acoesDaMontagem } from "./ligar";

export const metadata: Metadata = { title: "Montar o livro · Ecoa Memórias" };

export default function PaginaMontar({
  params,
}: PageProps<"/livro/[id]/montar">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Montar id={id} />
      ))}
    </Suspense>
  );
}

async function Montar({ id }: { id: string }) {
  const a = await livroDaPagina(id);
  const [tela, montagem] = await Promise.all([
    livroDaTela(a.livro, a.podeEscrever),
    montagemDaTela(a),
  ]);
  if (!montagem) notFound();
  return (
    <TelaMontarConteudo
      // A tela recomeça do que o banco tem quando outra pessoa mudou a montagem.
      key={`${montagem.rev}-${montagem.hash}`}
      livro={tela}
      montagem={montagem}
      acoes={acoesDaMontagem(id)}
    />
  );
}
