"use client";

// Nova história (P26): Gravar conversa (a ação principal, pensando na mesa de jantar) ou
// Subir áudios já gravados. Escolhidos os arquivos, a tela vira a lista de envio.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { IconeMicrofone } from "@/components/ui/icones";
import { SubirAudios, type ItemAudio } from "@/components/audios/subir-audios";
import type { EnviarArquivo } from "@/lib/audios/tus";
import type {
  AcoesAudios,
  LivroDaTela,
  PerguntaDaTela,
} from "@/lib/livro/tipos";

export function TelaNovaHistoria({
  livro,
  perguntas,
  acoes,
  enviarArquivo,
  inicial,
}: {
  livro: LivroDaTela;
  perguntas: PerguntaDaTela[]; // só as que ainda esperam resposta
  acoes: AcoesAudios;
  enviarArquivo?: EnviarArquivo;
  inicial?: ItemAudio[];
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12">
      <Link
        href={`/livro/${livro.id}`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Livro do {livro.autor}
      </Link>
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        Nova história
      </h1>
      {livro.podeEscrever ? (
        <SubirAudios
          livroId={livro.id}
          perguntas={perguntas}
          acoes={acoes}
          enviarArquivo={enviarArquivo}
          inicial={inicial}
          antes={
            <Link
              href={`/livro/${livro.id}/historias/gravar`}
              className={
                classesDoBotao({ larguraTotal: true }) +
                " sm:w-auto sm:self-start"
              }
            >
              <IconeMicrofone tamanho={20} />
              <span>Gravar conversa</span>
            </Link>
          }
        />
      ) : (
        <p className="text-ui-17 text-tinta-2">
          Este livro está em somente leitura.
        </p>
      )}
    </main>
  );
}
