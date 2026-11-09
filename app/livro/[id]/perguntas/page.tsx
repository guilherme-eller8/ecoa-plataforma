import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ABAS,
  TelaPerguntas,
  type AbaPerguntas,
} from "@/components/telas/tela-perguntas";
import { livroDaPagina } from "@/lib/livro/acesso";
import {
  causosDoLivro,
  enqueteDoLivro,
  fotosDoLivro,
  livroDaTela,
  perguntasDoLivro,
} from "@/lib/livro/dados";
import { linkDoAutor } from "@/lib/links";
import { acoesDoLivro } from "../ligar-acoes";

export const metadata: Metadata = { title: "Perguntas · Ecoa Memórias" };

export default function PaginaPerguntas({
  params,
  searchParams,
}: PageProps<"/livro/[id]/perguntas">) {
  return (
    <Suspense>
      {Promise.all([params, searchParams]).then(([{ id }, busca]) => {
        const aba = ABAS.includes(busca.aba as AbaPerguntas)
          ? (busca.aba as AbaPerguntas)
          : "perguntar";
        return <Perguntas id={id} aba={aba} />;
      })}
    </Suspense>
  );
}

async function Perguntas({ id, aba }: { id: string; aba: AbaPerguntas }) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, perguntas, causos, enquete, fotos] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    perguntasDoLivro(id),
    causosDoLivro(id),
    enqueteDoLivro(id),
    fotosDoLivro(id),
  ]);
  const acoes = acoesDoLivro(id);
  return (
    <TelaPerguntas
      livro={tela}
      perguntas={perguntas}
      causos={causos}
      enquete={enquete}
      fotos={fotos}
      linkAutor={linkDoAutor()}
      acoes={acoes.perguntas}
      acoesFotos={acoes.fotos}
      abaInicial={aba}
    />
  );
}
