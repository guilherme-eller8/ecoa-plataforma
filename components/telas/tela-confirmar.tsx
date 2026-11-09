"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Marca } from "@/components/ui/marca";
import type { AcaoFormulario } from "@/lib/resultado";

// O link do e-mail abre esta tela; só o toque em Entrar usa o link.
// Scanners de e-mail (Outlook, antivírus) abrem a página mas não tocam no botão.
export function TelaConfirmar({
  tokenHash,
  confirmar,
}: {
  tokenHash: string | null;
  confirmar: AcaoFormulario;
}) {
  const [resultado, enviar, enviando] = useActionState(confirmar, null);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10 pb-12">
      <Marca />
      <div className="flex flex-1 flex-col justify-center gap-8 py-12">
        <h1 className="font-ui text-tinta text-[32px] leading-tight font-semibold">
          Toque para entrar no seu livro
        </h1>
        {tokenHash ? (
          <form action={enviar} className="flex flex-col gap-4">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <Botao carregando={enviando} type="submit" className="w-full">
              Entrar
            </Botao>
          </form>
        ) : null}
        {(resultado && !resultado.ok) || !tokenHash ? (
          <div className="flex flex-col gap-4">
            <Aviso ok={false}>
              {resultado?.mensagem ?? "Este link está incompleto."}
            </Aviso>
            <a
              href="/entrar"
              className="font-ui text-tinta-2 min-h-12 self-start py-3 text-[16px] underline underline-offset-4"
            >
              Pedir outro link
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
