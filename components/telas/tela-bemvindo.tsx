// Boas-vindas de quem aceitou o convite (P82): duas portas. A principal é gravar uma conversa
// com o autor; a outra, a mensagem que o autor só vê no livro impresso (P21).
import Link from "next/link";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { Marca } from "@/components/ui/marca";

export function TelaBemvindo({
  livroId,
  autor,
  podeEscrever,
  abrirMensagem,
}: {
  livroId: string;
  autor: string;
  podeEscrever: boolean;
  abrirMensagem?: () => Promise<void>;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10 pb-12">
      <Marca />
      <div className="flex flex-1 flex-col justify-center gap-8 py-12">
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Que bom ter você no livro de {autor}
        </h1>
        {podeEscrever ? (
          <div className="flex flex-col gap-6">
            <Link
              href={`/livro/${livroId}/historias/gravar?bemvindo=1`}
              className={classesDoBotao({ larguraTotal: true })}
            >
              Gravar uma conversa com {autor}
            </Link>
            <form action={abrirMensagem} className="flex flex-col gap-2">
              <Botao type="submit" variante="secundario" larguraTotal>
                Deixar sua mensagem
              </Botao>
              <p className="text-ui-15 text-tinta-2">
                Sem que {autor} saiba: só vê no livro impresso. Quem ajuda no
                livro pode ler.
              </p>
            </form>
          </div>
        ) : (
          <Link
            href={`/livro/${livroId}`}
            className={classesDoBotao({ larguraTotal: true })}
          >
            Ver o livro
          </Link>
        )}
      </div>
      {podeEscrever ? (
        <Link
          href={`/livro/${livroId}`}
          className={classesDoBotao({ variante: "texto" }) + " self-center"}
        >
          Ver o livro
        </Link>
      ) : null}
    </main>
  );
}
