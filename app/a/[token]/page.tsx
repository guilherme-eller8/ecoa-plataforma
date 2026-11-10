import { Suspense } from "react";
import { TelaAutor, TelaAutorInvalido } from "@/components/telas/tela-autor";
import { paginaDoAutor } from "@/lib/autor/pagina";
import { acoesDoAutor } from "./acoes-ligadas";

export default function PaginaAutor({ params }: PageProps<"/a/[token]">) {
  return (
    <Suspense>
      {params.then(({ token }) => (
        <Autor token={token} />
      ))}
    </Suspense>
  );
}

async function Autor({ token }: { token: string }) {
  const pagina = await paginaDoAutor(token);
  if (!pagina) return <TelaAutorInvalido />;
  return (
    <TelaAutor
      token={token}
      pagina={pagina}
      modo={{ tipo: "inicio" }}
      acoes={acoesDoAutor(token)}
    />
  );
}
