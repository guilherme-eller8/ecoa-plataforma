"use client";

// Topo da tela inicial (/) quando há convite para o e-mail de quem entrou (P59).
import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { Marca } from "@/components/ui/marca";
import type { Resposta } from "@/lib/livro/tipos";

export type ConvitePendenteDaTela = { id: string; autor: string };

function Cartao({
  convite,
  aceitar,
}: {
  convite: ConvitePendenteDaTela;
  aceitar: (id: string) => Promise<Resposta>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <li className="rounded-cartao bg-papel border-linha flex flex-col gap-4 border p-5">
      <p className="font-livro text-livro-24 text-tinta leading-snug">
        Você foi convidado para o livro de {convite.autor}
      </p>
      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
      <Botao
        larguraTotal
        carregando={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await aceitar(convite.id);
            if (!r.ok) setErro(r.mensagem);
          })
        }
      >
        Aceitar
      </Botao>
    </li>
  );
}

export function TelaConvitesPendentes({
  convites,
  livroAtual,
  aceitar,
}: {
  convites: ConvitePendenteDaTela[];
  livroAtual: string | null; // o livro de que a pessoa já é membro, se houver
  aceitar: (id: string) => Promise<Resposta>;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-6 pt-10 pb-12">
      <Marca />
      <ul className="flex flex-col gap-4">
        {convites.map((c) => (
          <Cartao key={c.id} convite={c} aceitar={aceitar} />
        ))}
      </ul>
      {livroAtual ? (
        <Link
          href={`/livro/${livroAtual}`}
          className={classesDoBotao({ variante: "texto" }) + " self-start"}
        >
          Ir para o meu livro
        </Link>
      ) : null}
    </main>
  );
}
