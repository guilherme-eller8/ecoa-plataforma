import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
  ConfigurarFotos,
  ConfigurarPerguntas,
  ConfigurarQuem,
} from "@/components/telas/configurar";
import { livroDaPagina } from "@/lib/livro/acesso";
import { ehPasso } from "@/lib/livro/configuracao";
import { livroDaTela } from "@/lib/livro/dados";
import { acoesDoLivro } from "../../ligar-acoes";

export const metadata: Metadata = {
  title: "Configurar o livro · Ecoa Memórias",
};

export default function PaginaConfigurar({
  params,
}: PageProps<"/livro/[id]/configurar/[passo]">) {
  return (
    <Suspense>
      {params.then(({ id, passo }) => (
        <Configurar id={id} passo={passo} />
      ))}
    </Suspense>
  );
}

async function Configurar({ id, passo }: { id: string; passo: string }) {
  if (!ehPasso(passo)) notFound();
  const { livro, podeEscrever } = await livroDaPagina(id);
  if (!podeEscrever) redirect(`/livro/${id}`);
  const tela = await livroDaTela(livro, podeEscrever);
  const acoes = acoesDoLivro(id);
  const props = { livro: tela, acoes: acoes.configuracao, fotos: acoes.fotos };
  if (passo === "quem") return <ConfigurarQuem {...props} />;
  if (passo === "perguntas") return <ConfigurarPerguntas {...props} />;
  return <ConfigurarFotos {...props} />;
}
