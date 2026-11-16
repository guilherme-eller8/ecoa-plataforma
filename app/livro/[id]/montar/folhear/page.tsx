import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaFolhear } from "@/components/telas/tela-folhear";
import { livroDaPagina, nomeDoAutor } from "@/lib/livro/acesso";
import { folhear } from "./acoes";

export const metadata: Metadata = { title: "Folhear o livro · Ecoa Memórias" };

export default function PaginaFolhear({
  params,
}: PageProps<"/livro/[id]/montar/folhear">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Folhear id={id} />
      ))}
    </Suspense>
  );
}

async function Folhear({ id }: { id: string }) {
  const a = await livroDaPagina(id);
  return (
    <TelaFolhear
      livroId={a.livro.id}
      autor={nomeDoAutor(a.livro)}
      acoes={{ folhear: folhear.bind(null, a.livro.id) }}
    />
  );
}
