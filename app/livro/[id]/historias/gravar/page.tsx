import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaGravarConversa } from "@/components/telas/tela-gravar-conversa";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela, perguntasDoLivro } from "@/lib/livro/dados";
import { acoesDoLivro } from "../../ligar-acoes";

export const metadata: Metadata = { title: "Gravar conversa · Ecoa Memórias" };

export default function PaginaGravarConversa({
  params,
  searchParams,
}: PageProps<"/livro/[id]/historias/gravar">) {
  return (
    <Suspense>
      {Promise.all([params, searchParams]).then(([{ id }, busca]) => (
        <GravarConversa
          id={id}
          pergunta={typeof busca.pergunta === "string" ? busca.pergunta : null}
        />
      ))}
    </Suspense>
  );
}

async function GravarConversa({
  id,
  pergunta,
}: {
  id: string;
  pergunta: string | null;
}) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, perguntas] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    perguntasDoLivro(id),
  ]);
  return (
    <TelaGravarConversa
      livro={tela}
      perguntas={perguntas.filter(
        (p) => p.estado === "para_enviar" || p.estado === "enviada",
      )}
      acoes={acoesDoLivro(id).audios}
      perguntaInicial={pergunta}
    />
  );
}
