import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaHistorias } from "@/components/telas/tela-historias";
import { historiasDoLivro } from "@/lib/historias/dados";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";
import { marcarHistoriaVista } from "./acoes";

export const metadata: Metadata = { title: "Histórias · Ecoa Memórias" };

export default function PaginaHistorias({
  params,
}: PageProps<"/livro/[id]/historias">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Historias id={id} />
      ))}
    </Suspense>
  );
}

async function Historias({ id }: { id: string }) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, historias] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    historiasDoLivro(id),
  ]);
  return (
    <TelaHistorias
      livro={tela}
      historias={historias}
      marcarVista={marcarHistoriaVista.bind(null, id)}
    />
  );
}
