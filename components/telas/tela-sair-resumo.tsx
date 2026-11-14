"use client";

// /resumo/sair (P63): um toque para parar o resumo semanal. Abrir o link não desliga nada
// (robôs de e-mail abrem links sozinhos).
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Marca } from "@/components/ui/marca";
import type { Resposta } from "@/lib/livro/tipos";

export function TelaSairResumo({
  valido,
  sair,
}: {
  valido: boolean;
  sair: () => Promise<Resposta>;
}) {
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10 pb-12">
      <Marca />
      <div className="flex flex-1 flex-col justify-center gap-6 py-12">
        {!valido ? (
          <h1 className="font-livro text-livro-28 text-tinta leading-tight">
            Este link não vale mais
          </h1>
        ) : feito ? (
          <>
            <h1 className="font-livro text-livro-28 text-tinta leading-tight">
              Pronto, você não recebe mais o resumo
            </h1>
            <p className="text-ui-17 text-tinta-2">
              Para voltar, ligue em Configurações, no livro.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-livro text-livro-28 text-tinta leading-tight">
              Parar o resumo semanal?
            </h1>
            <p className="text-ui-17 text-tinta-2">
              É o e-mail de domingo com os números do livro.
            </p>
            {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
            <Botao
              larguraTotal
              carregando={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await sair();
                  if (!r.ok) return setErro(r.mensagem);
                  setFeito(true);
                })
              }
            >
              Não quero mais receber
            </Botao>
          </>
        )}
      </div>
    </main>
  );
}
