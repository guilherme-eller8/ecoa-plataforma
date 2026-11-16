import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaFolhear } from "@/components/telas/tela-folhear";
import { livroDaPagina, nomeDoAutor } from "@/lib/livro/acesso";
import { ajustarFoto } from "@/app/livro/[id]/historias/editor-acoes";
import { folhear, fotoParaAjustar } from "./acoes";

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
      acoes={{
        folhear: folhear.bind(null, a.livro.id),
        fotoParaAjustar: fotoParaAjustar.bind(null, a.livro.id),
        // A mesma ação do editor: mesma regra (RLS, só a 1ª foto vai ao lado).
        ajustarFoto: ajustarFoto.bind(null, a.livro.id),
      }}
    />
  );
}
