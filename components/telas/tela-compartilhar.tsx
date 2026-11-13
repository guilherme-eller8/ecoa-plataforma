"use client";

// Compartilhar do Android (fase C do prompt 5): os áudios que chegaram do WhatsApp entram
// direto em Subir áudios, já escolhidos. Com mais de um livro, primeiro escolhe o livro.
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  novoItem,
  SubirAudios,
  type ItemAudio,
} from "@/components/audios/subir-audios";
import { classesDoBotao } from "@/components/ui/botao";
import { lerCompartilhados } from "@/lib/pwa/compartilhados";
import type {
  AcoesAudios,
  LivroDaTela,
  PerguntaDaTela,
} from "@/lib/livro/tipos";

const moldura =
  "mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12";

export function TelaCompartilhar({
  livro,
  livros,
  perguntas,
  acoes,
  erro,
  ler = lerCompartilhados,
}: {
  livro: LivroDaTela | null;
  livros: { id: string; autor: string }[];
  perguntas: PerguntaDaTela[];
  acoes: AcoesAudios | null;
  erro: boolean;
  ler?: () => Promise<File[]>;
}) {
  const [itens, setItens] = useState<ItemAudio[] | null>(null);

  useEffect(() => {
    if (!livro || erro) return;
    let vivo = true;
    void ler()
      .catch(() => [] as File[])
      .then((arquivos) => {
        if (vivo) setItens(arquivos.map((a) => novoItem(a)));
      });
    return () => {
      vivo = false;
    };
  }, [livro, erro, ler]);

  if (erro)
    return (
      <main className={moldura}>
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Os áudios não chegaram
        </h1>
        <p className="text-ui-17 text-tinta-2">
          Abra o Ecoa uma vez e compartilhe de novo pelo WhatsApp.
        </p>
        <Link href="/" className={classesDoBotao({ larguraTotal: true })}>
          Abrir o Ecoa
        </Link>
      </main>
    );

  if (!livro)
    return (
      <main className={moldura}>
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Para qual livro?
        </h1>
        <ul className="flex flex-col gap-3">
          {livros.map((l) => (
            <li key={l.id}>
              <Link
                href={`/compartilhar?livro=${l.id}`}
                className="rounded-cartao border-linha bg-papel font-livro text-livro-20 text-tinta hover:bg-polen-2 min-h-alvo flex w-full items-center border px-5 py-4"
              >
                Livro do {l.autor}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );

  return (
    <main className={moldura}>
      <Link
        href={`/livro/${livro.id}`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Livro do {livro.autor}
      </Link>
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        Áudios do WhatsApp
      </h1>
      {itens === null ? (
        <p className="text-ui-17 text-tinta-2">Abrindo os áudios…</p>
      ) : !livro.podeEscrever || !acoes ? (
        <p className="text-ui-17 text-tinta-2">
          Este livro está em somente leitura.
        </p>
      ) : (
        <SubirAudios
          livroId={livro.id}
          perguntas={perguntas}
          acoes={acoes}
          inicial={itens}
        />
      )}
    </main>
  );
}
