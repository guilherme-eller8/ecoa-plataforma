import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaNovaHistoria } from "@/components/telas/tela-nova-historia";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela, perguntasDoLivro } from "@/lib/livro/dados";
import { acoesDoLivro } from "../../ligar-acoes";

export const metadata: Metadata = { title: "Nova história · Ecoa Memórias" };

export default function PaginaNovaHistoria({
  params,
}: PageProps<"/livro/[id]/historias/nova">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <NovaHistoria id={id} />
      ))}
    </Suspense>
  );
}

async function NovaHistoria({ id }: { id: string }) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, perguntas] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    perguntasDoLivro(id),
  ]);
  return (
    <TelaNovaHistoria
      livro={tela}
      perguntas={perguntas.filter(
        (p) => p.estado === "para_enviar" || p.estado === "enviada",
      )}
      acoes={acoesDoLivro(id).audios}
    />
  );
}
