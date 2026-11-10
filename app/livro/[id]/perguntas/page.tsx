import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaPerguntas } from "@/components/telas/tela-perguntas";
import { ehAba, type AbaPerguntas } from "@/lib/perguntas/abas";
import { livroDaPagina } from "@/lib/livro/acesso";
import {
  causosDoLivro,
  enqueteDoLivro,
  fotosDoLivro,
  linkDoAutor,
  livroDaTela,
  perguntasDoLivro,
} from "@/lib/livro/dados";
import { acoesDoLivro } from "../ligar-acoes";

export const metadata: Metadata = { title: "Perguntas · Ecoa Memórias" };

export default function PaginaPerguntas({
  params,
  searchParams,
}: PageProps<"/livro/[id]/perguntas">) {
  return (
    <Suspense>
      {Promise.all([params, searchParams]).then(([{ id }, busca]) => {
        const aba = ehAba(busca.aba) ? busca.aba : "perguntar";
        return <Perguntas id={id} aba={aba} />;
      })}
    </Suspense>
  );
}

async function Perguntas({ id, aba }: { id: string; aba: AbaPerguntas }) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, perguntas, causos, enquete, fotos, linkAutor] =
    await Promise.all([
      livroDaTela(livro, podeEscrever),
      perguntasDoLivro(id),
      causosDoLivro(id),
      enqueteDoLivro(id),
      fotosDoLivro(id),
      linkDoAutor(id),
    ]);
  const acoes = acoesDoLivro(id);
  return (
    <TelaPerguntas
      livro={tela}
      perguntas={perguntas}
      causos={causos}
      enquete={enquete}
      fotos={fotos}
      linkAutor={linkAutor}
      acoes={acoes.perguntas}
      acoesFotos={acoes.fotos}
      abaInicial={aba}
    />
  );
}
