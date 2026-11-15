import { after } from "next/server";
import { Suspense } from "react";
import { TelaAutor, TelaAutorInvalido } from "@/components/telas/tela-autor";
import { registrarEntradaDoAutor } from "@/lib/autor/entrada";
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
  after(() => registrarEntradaDoAutor(token));
  return (
    <TelaAutor
      token={token}
      pagina={pagina}
      modo={{ tipo: "inicio" }}
      acoes={acoesDoAutor(token)}
    />
  );
}
