import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TelaNovaEnquete } from "@/components/telas/tela-nova-enquete";
import { livroDaPagina } from "@/lib/livro/acesso";
import { causosDoLivro, enqueteDoLivro, livroDaTela } from "@/lib/livro/dados";
import { acoesDoLivro } from "../../ligar-acoes";

export const metadata: Metadata = { title: "Nova enquete · Ecoa Memórias" };

export default function PaginaNovaEnquete({
  params,
  searchParams,
}: PageProps<"/livro/[id]/enquete/nova">) {
  return (
    <Suspense>
      {Promise.all([params, searchParams]).then(([{ id }, busca]) => (
        <NovaEnquete
          id={id}
          causo={typeof busca.causo === "string" ? busca.causo : null}
        />
      ))}
    </Suspense>
  );
}

async function NovaEnquete({
  id,
  causo,
}: {
  id: string;
  causo: string | null;
}) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const voltar = `/livro/${id}/perguntas?aba=enquete`;
  if (!podeEscrever) redirect(voltar);
  const [tela, causos, enquete] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    causosDoLivro(id),
    enqueteDoLivro(id),
  ]);
  // Uma enquete aberta por livro: com uma aberta, a página volta aos resultados.
  if (enquete?.estado === "aberta") redirect(voltar);
  const livres = causos.filter(
    (c) => c.estado === "novo" || c.estado === "na_enquete",
  );
  return (
    <TelaNovaEnquete
      livro={tela}
      causos={livres}
      causoInicial={livres.some((c) => c.id === causo) ? causo : null}
      abrirEnquete={acoesDoLivro(id).perguntas.abrirEnquete}
    />
  );
}
