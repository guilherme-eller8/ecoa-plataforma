import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaVersao } from "@/components/telas/tela-versao";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";
import type { AcoesVersao } from "@/lib/livro/montar-tipos";
import { versaoPublicada } from "@/lib/livro/versao-servidor";
import * as acoes from "./acoes";

export const metadata: Metadata = { title: "Livro publicado · Ecoa Memórias" };

export default function PaginaVersao({
  params,
}: PageProps<"/livro/[id]/publicado/[versao]">) {
  return (
    <Suspense>
      {params.then(({ id, versao }) => (
        <Versao id={id} versao={versao} />
      ))}
    </Suspense>
  );
}

async function Versao({ id, versao }: { id: string; versao: string }) {
  const n = Number(versao);
  if (!Number.isInteger(n) || n < 1 || n > 9999) notFound();
  const a = await livroDaPagina(id);
  const [tela, v] = await Promise.all([
    livroDaTela(a.livro, a.podeEscrever),
    versaoPublicada(id, n),
  ]);
  if (!v) notFound();
  const ligadas: AcoesVersao = {
    estado: acoes.estadoDaVersao.bind(null, id, n),
    previas: acoes.previasDaVersao.bind(null, id, n),
    baixar: acoes.baixarPdf.bind(null, id, n),
  };
  return <TelaVersao key={v.id} livro={tela} versao={v} acoes={ligadas} />;
}
