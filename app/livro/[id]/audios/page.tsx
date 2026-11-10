import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaAudios } from "@/components/telas/tela-audios";
import { livroDaPagina } from "@/lib/livro/acesso";
import { audiosDoLivro, livroDaTela } from "@/lib/livro/dados";

export const metadata: Metadata = { title: "Áudios recebidos · Ecoa Memórias" };

export default function PaginaAudios({
  params,
}: PageProps<"/livro/[id]/audios">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Audios id={id} />
      ))}
    </Suspense>
  );
}

async function Audios({ id }: { id: string }) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  const [tela, audios] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    audiosDoLivro(id),
  ]);
  return <TelaAudios livro={tela} audios={audios} />;
}
