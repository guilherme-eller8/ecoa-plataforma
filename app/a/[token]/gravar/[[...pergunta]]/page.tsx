import { Suspense } from "react";
import { TelaAutor, TelaAutorInvalido } from "@/components/telas/tela-autor";
import { paginaDoAutor } from "@/lib/autor/pagina";
import { acoesDoAutor } from "../../acoes-ligadas";

// /a/[token]/gravar → história livre; /a/[token]/gravar/[pergunta] → resposta (link do WhatsApp).
export default function PaginaGravarAutor({
  params,
}: PageProps<"/a/[token]/gravar/[[...pergunta]]">) {
  return (
    <Suspense>
      {params.then(({ token, pergunta }) => (
        <Gravar token={token} pergunta={pergunta?.[0] ?? null} />
      ))}
    </Suspense>
  );
}

async function Gravar({
  token,
  pergunta,
}: {
  token: string;
  pergunta: string | null;
}) {
  const pagina = await paginaDoAutor(token);
  if (!pagina) return <TelaAutorInvalido />;
  return (
    <TelaAutor
      token={token}
      pagina={pagina}
      modo={{ tipo: "gravar", perguntaId: pergunta }}
      acoes={acoesDoAutor(token)}
    />
  );
}
