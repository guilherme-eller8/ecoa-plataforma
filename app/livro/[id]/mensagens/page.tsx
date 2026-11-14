import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaMensagens } from "@/components/telas/tela-mensagens";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";
import { linkDeMensagens, mensagensDoLivro } from "@/lib/mensagens/dados";
import type { AcoesMensagens } from "@/lib/mensagens/tipos";
import * as acoes from "./acoes";

export const metadata: Metadata = { title: "Mensagens · Ecoa Memórias" };

export default function PaginaMensagens({
  params,
}: PageProps<"/livro/[id]/mensagens">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Mensagens id={id} />
      ))}
    </Suspense>
  );
}

async function Mensagens({ id }: { id: string }) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, mensagens, link] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    mensagensDoLivro(id),
    linkDeMensagens(id),
  ]);
  const ligadas: AcoesMensagens = {
    pegarLink: acoes.pegarLink.bind(null, id),
    trocarLink: acoes.trocarLink.bind(null, id),
    editar: acoes.editar.bind(null, id),
    noLivro: acoes.noLivro.bind(null, id),
    arquivar: acoes.arquivar.bind(null, id),
    apagar: acoes.apagar.bind(null, id),
  };
  return (
    <TelaMensagens
      livro={tela}
      mensagens={mensagens}
      link={link}
      acoes={ligadas}
    />
  );
}
