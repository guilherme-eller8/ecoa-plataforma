import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaMontarConferir } from "@/components/telas/tela-montar";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";
import { montagemDaTela } from "@/lib/livro/montar-servidor";
import { acoesDaMontagem } from "../ligar";

export const metadata: Metadata = { title: "Conferir o livro · Ecoa Memórias" };

export default function PaginaMontarConferir({
  params,
}: PageProps<"/livro/[id]/montar/conferir">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Conferir id={id} />
      ))}
    </Suspense>
  );
}

async function Conferir({ id }: { id: string }) {
  const a = await livroDaPagina(id);
  const [tela, montagem] = await Promise.all([
    livroDaTela(a.livro, a.podeEscrever),
    montagemDaTela(a),
  ]);
  if (!montagem) notFound();
  return (
    <TelaMontarConferir
      key={`${montagem.rev}-${montagem.hash}`}
      livro={tela}
      montagem={montagem}
      acoes={acoesDaMontagem(id)}
    />
  );
}
