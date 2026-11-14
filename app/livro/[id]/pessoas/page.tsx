import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaPessoas } from "@/components/telas/tela-pessoas";
import { livroDaPagina, nomeDoAutor } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";
import { pessoasDoLivro } from "@/lib/livro/pessoas";
import { acoesDePessoas } from "./ligar";

export const metadata: Metadata = { title: "Quem ajuda · Ecoa Memórias" };

export default function PaginaPessoas({
  params,
}: PageProps<"/livro/[id]/pessoas">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Pessoas id={id} />
      ))}
    </Suspense>
  );
}

async function Pessoas({ id }: { id: string }) {
  const { usuario, livro, podeEscrever } = await livroDaPagina(id);
  const ehResponsavel = livro.papel === "responsavel";
  const [tela, pessoas] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    pessoasDoLivro(id, usuario.id, nomeDoAutor(livro), ehResponsavel),
  ]);
  return <TelaPessoas livro={tela} {...pessoas} acoes={acoesDePessoas(id)} />;
}
