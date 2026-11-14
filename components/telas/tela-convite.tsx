"use client";

// /convite/{token} (P59): o link só apresenta o convite. Aceitar é pela conta com o e-mail
// convidado; quem abre com outra conta vê o e-mail mascarado.
import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { Marca } from "@/components/ui/marca";
import type { Resposta } from "@/lib/livro/tipos";

export type EstadoTelaConvite =
  | { tipo: "invalido" }
  | { tipo: "entrar"; quem: string | null; autor: string }
  | { tipo: "aceitar"; quem: string | null; autor: string }
  | { tipo: "outro_email"; emailMascarado: string };

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10 pb-12">
      <Marca />
      <div className="flex flex-1 flex-col justify-center gap-6 py-12">
        {children}
      </div>
    </main>
  );
}

function frase(quem: string | null, autor: string) {
  return `${quem ?? "Sua família"} chamou você para ajudar no livro de ${autor}.`;
}

export function TelaConvite({
  estado,
  aceitar,
  sair,
}: {
  estado: EstadoTelaConvite;
  aceitar?: () => Promise<Resposta>;
  sair?: () => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (estado.tipo === "invalido")
    return (
      <Moldura>
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Este convite não vale mais
        </h1>
        <p className="text-ui-17 text-tinta-2">Peça um novo a quem convidou.</p>
      </Moldura>
    );

  if (estado.tipo === "outro_email")
    return (
      <Moldura>
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Este convite é para {estado.emailMascarado}
        </h1>
        <p className="text-ui-17 text-tinta-2">Saia e entre com esse e-mail.</p>
        {sair ? (
          <form action={sair}>
            <Botao type="submit" larguraTotal>
              Entrar com outra conta
            </Botao>
          </form>
        ) : null}
      </Moldura>
    );

  return (
    <Moldura>
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        {frase(estado.quem, estado.autor)}
      </h1>
      <p className="text-ui-17 text-tinta-2">
        Você vai poder gravar e editar as histórias junto.
      </p>
      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
      {estado.tipo === "entrar" ? (
        <Link href="/entrar" className={classesDoBotao({ larguraTotal: true })}>
          Entrar para aceitar
        </Link>
      ) : (
        <Botao
          larguraTotal
          carregando={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await aceitar?.();
              if (r && !r.ok) setErro(r.mensagem);
            })
          }
        >
          Aceitar
        </Botao>
      )}
    </Moldura>
  );
}
