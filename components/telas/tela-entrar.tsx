"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Marca } from "@/components/ui/marca";
import type { AcaoFormulario } from "@/lib/resultado";

const ERROS: Record<string, string> = {
  sem_livro: "Este e-mail ainda não tem um livro.",
  falhou: "Não deu para entrar. Tente de novo.",
};

type Props = {
  erro?: string | null;
  pedirLink: AcaoFormulario;
  entrarComGoogle: () => Promise<void> | void;
  emailAberto?: boolean;
};

export function TelaEntrar({
  erro,
  pedirLink,
  entrarComGoogle,
  emailAberto = false,
}: Props) {
  const [mostrarEmail, setMostrarEmail] = useState(emailAberto);
  const [indoAoGoogle, setIndoAoGoogle] = useState(false);
  const [resultado, enviar, enviando] = useActionState(pedirLink, null);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10 pb-12">
      <Marca />
      <div className="flex flex-1 flex-col justify-center gap-8 py-12">
        <h1 className="font-ui text-tinta text-[32px] leading-tight font-semibold">
          Entre no seu livro
        </h1>
        {erro && ERROS[erro] && <Aviso ok={false}>{ERROS[erro]}</Aviso>}

        <Botao
          carregando={indoAoGoogle}
          onClick={async () => {
            setIndoAoGoogle(true);
            await entrarComGoogle();
          }}
          className="w-full"
        >
          <LogoGoogle />
          Entrar com Google
        </Botao>

        {!mostrarEmail ? (
          <Botao
            variante="texto"
            onClick={() => setMostrarEmail(true)}
            className="self-start"
          >
            Prefiro receber um link por e-mail
          </Botao>
        ) : (
          <form action={enviar} className="flex flex-col gap-4">
            <Campo
              rotulo="Seu e-mail"
              nome="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
            />
            <Botao
              variante="secundario"
              carregando={enviando}
              type="submit"
              className="w-full"
            >
              Receber link
            </Botao>
            {resultado && <Aviso ok={resultado.ok}>{resultado.mensagem}</Aviso>}
          </form>
        )}
      </div>
    </main>
  );
}

function LogoGoogle() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 48 48"
      className="rounded-full bg-white p-0.5"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
