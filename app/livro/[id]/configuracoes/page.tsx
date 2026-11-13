import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaConfiguracoes } from "@/components/telas/tela-configuracoes";
import { nomesDoLivro } from "@/lib/historias/dados";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";
import {
  acrescentarNome,
  ajustarNome,
  confirmarProcessamentoIA,
} from "./acoes";

export const metadata: Metadata = { title: "Configurações · Ecoa Memórias" };

export default function PaginaConfiguracoes({
  params,
}: PageProps<"/livro/[id]/configuracoes">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Configuracoes id={id} />
      ))}
    </Suspense>
  );
}

async function Configuracoes({ id }: { id: string }) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, nomes] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    nomesDoLivro(id),
  ]);
  return (
    <TelaConfiguracoes
      livro={tela}
      nomes={nomes}
      acoes={{
        confirmarIA: confirmarProcessamentoIA.bind(null, id),
        ajustar: ajustarNome.bind(null, id),
        acrescentar: acrescentarNome.bind(null, id),
      }}
    />
  );
}
