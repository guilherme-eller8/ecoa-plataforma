import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
  ConfigurarAjuda,
  ConfigurarFotos,
  ConfigurarPerguntas,
  ConfigurarQuem,
} from "@/components/telas/configurar";
import { livroDaPagina } from "@/lib/livro/acesso";
import { ehPasso } from "@/lib/livro/configuracao";
import { livroDaTela } from "@/lib/livro/dados";
import { acoesDoLivro } from "../../ligar-acoes";
import { acoesDePessoas } from "../../pessoas/ligar";

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
  // Quem mais ajuda: só o responsável convida (P60).
  if (passo === "ajuda" && livro.papel !== "responsavel") notFound();
  if (!podeEscrever) redirect(`/livro/${id}`);
  const tela = await livroDaTela(livro, podeEscrever);
  const acoes = acoesDoLivro(id);
  const props = { livro: tela, acoes: acoes.configuracao, fotos: acoes.fotos };
  if (passo === "quem") return <ConfigurarQuem {...props} />;
  if (passo === "perguntas") return <ConfigurarPerguntas {...props} />;
  if (passo === "ajuda")
    return (
      <ConfigurarAjuda
        livro={tela}
        acoes={acoes.configuracao}
        convidar={acoesDePessoas(id).convidar}
      />
    );
  return <ConfigurarFotos {...props} />;
}
