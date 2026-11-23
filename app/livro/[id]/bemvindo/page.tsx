import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaBemvindo } from "@/components/telas/tela-bemvindo";
import { nomeSeguro } from "@/lib/convite/textos";
import { livroDaPagina, nomeDoAutor } from "@/lib/livro/acesso";
import { abrirMinhaMensagem } from "./acoes";

export const metadata: Metadata = { title: "Boas-vindas · Ecoa Memórias" };

export default function PaginaBemvindo({
  params,
}: PageProps<"/livro/[id]/bemvindo">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Bemvindo id={id} />
      ))}
    </Suspense>
  );
}

async function Bemvindo({ id }: { id: string }) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  return (
    <TelaBemvindo
      livroId={id}
      autor={nomeSeguro(nomeDoAutor(livro)) || "quem conta"}
      podeEscrever={podeEscrever}
      abrirMensagem={abrirMinhaMensagem.bind(null, id)}
    />
  );
}
