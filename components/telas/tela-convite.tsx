"use client";

// /convite/{token}. P59: convite por e-mail (antigo). P81: convite pelo nome; o convidado
// digita o próprio e-mail do Google, entra e aceita em 1 toque. O e-mail do convite só
// chega aqui mascarado; o estado vem pronto do servidor (lib/convite/estado.ts).
import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Marca } from "@/components/ui/marca";
import type { EstadoTelaConvite } from "@/lib/convite/estado";
import type { Resposta } from "@/lib/livro/tipos";

export type { EstadoTelaConvite };

export type AcoesTelaConvite = {
  definirEmail?: (
    email: string,
  ) => Promise<Resposta<{ emailMascarado: string }>>;
  receberLink?: () => Promise<Resposta>;
  aceitar?: () => Promise<Resposta>;
  entrarComGoogle?: () => Promise<void> | void;
  sair?: () => Promise<void>;
};

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

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-livro text-livro-28 text-tinta leading-tight">
      {children}
    </h1>
  );
}

function frase(quem: string | null, autor: string) {
  return `${quem ?? "Sua família"} chamou você para ajudar no livro de ${autor}.`;
}

export function TelaConvite({
  estado,
  ...acoes
}: { estado: EstadoTelaConvite } & AcoesTelaConvite) {
  if (estado.tipo === "invalido")
    return (
      <Moldura>
        <Titulo>Este convite não vale mais</Titulo>
        <p className="text-ui-17 text-tinta-2">Peça um novo a quem convidou.</p>
      </Moldura>
    );

  if (estado.tipo === "em_uso")
    return (
      <Moldura>
        <Titulo>Este convite já está com outra pessoa</Titulo>
        <p className="text-ui-17 text-tinta-2">
          Se era para você, peça um novo a {estado.quem ?? "quem convidou"}.
        </p>
      </Moldura>
    );

  if (estado.tipo === "outro_email")
    return (
      <Moldura>
        <Titulo>Este convite é para {estado.emailMascarado}</Titulo>
        <p className="text-ui-17 text-tinta-2">Saia e entre com esse e-mail.</p>
        {acoes.sair ? (
          <form action={acoes.sair}>
            <Botao type="submit" larguraTotal>
              Entrar com outra conta
            </Botao>
          </form>
        ) : null}
      </Moldura>
    );

  if (estado.tipo === "entrar_antigo")
    return (
      <Moldura>
        <Titulo>{frase(estado.quem, estado.autor)}</Titulo>
        <p className="text-ui-17 text-tinta-2">
          Você vai poder gravar e editar as histórias junto.
        </p>
        <Link href="/entrar" className={classesDoBotao({ larguraTotal: true })}>
          Entrar para aceitar
        </Link>
      </Moldura>
    );

  if (estado.tipo === "aceitar") return <Aceitar estado={estado} {...acoes} />;

  return <PeloNome estado={estado} {...acoes} />;
}

function Aceitar({
  estado,
  aceitar,
}: {
  estado: Extract<EstadoTelaConvite, { tipo: "aceitar" }>;
} & AcoesTelaConvite) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <Moldura>
      <Titulo>{frase(estado.quem, estado.autor)}</Titulo>
      <p className="text-ui-17 text-tinta-2">
        Você vai poder gravar e editar as histórias junto.
      </p>
      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
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
        <span className="truncate">Aceitar como {estado.email}</span>
      </Botao>
    </Moldura>
  );
}

/** Convite pelo nome, sem sessão: pedir o e-mail e, depois, entrar. */
function PeloNome({
  estado,
  definirEmail,
  receberLink,
  entrarComGoogle,
}: {
  estado: Extract<EstadoTelaConvite, { tipo: "pedir_email" | "entrar" }>;
} & AcoesTelaConvite) {
  const [definido, setDefinido] = useState<string | null>(
    estado.tipo === "entrar" ? estado.emailMascarado : null,
  );
  const [corrigindo, setCorrigindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [indoAoGoogle, setIndoAoGoogle] = useState(false);
  const [pendente, iniciar] = useTransition();
  const podeCorrigir = estado.tipo === "entrar" ? estado.podeCorrigir : true;

  if (definido && !corrigindo)
    return (
      <Moldura>
        <Titulo>Pronto. Entre com {definido}</Titulo>
        <Botao
          larguraTotal
          carregando={indoAoGoogle}
          onClick={async () => {
            setIndoAoGoogle(true);
            await entrarComGoogle?.();
          }}
        >
          Entrar com Google
        </Botao>
        {aviso ? <Aviso ok>{aviso}</Aviso> : null}
        <div className="flex flex-col items-start gap-1">
          <Botao
            variante="texto"
            carregando={pendente}
            onClick={() =>
              iniciar(async () => {
                await receberLink?.();
                setAviso(
                  "Se o e-mail estiver certo, o link chega em instantes.",
                );
              })
            }
          >
            Receber link por e-mail
          </Botao>
          {podeCorrigir ? (
            <Botao
              variante="texto"
              onClick={() => {
                setErro(null);
                setAviso(null);
                setCorrigindo(true);
              }}
            >
              Corrigir o e-mail
            </Botao>
          ) : null}
        </div>
      </Moldura>
    );

  const nome = estado.nome;
  return (
    <Moldura>
      <Titulo>Oi, {nome}!</Titulo>
      {estado.tipo === "pedir_email" ? (
        <p className="text-ui-17 text-tinta-2">
          {estado.quem ?? "Sua família"} chamou você para o livro de{" "}
          {estado.autor}.
        </p>
      ) : null}
      <form
        className="flex flex-col gap-4"
        action={(dados) =>
          iniciar(async () => {
            setErro(null);
            const r = await definirEmail?.(String(dados.get("email") ?? ""));
            if (!r) return;
            if (!r.ok) return setErro(r.mensagem);
            setDefinido(r.dados?.emailMascarado ?? null);
            setCorrigindo(false);
          })
        }
      >
        <Campo
          rotulo="Seu e-mail do Google"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          dica="É o e-mail que você usa no celular, sem +"
          erro={erro ?? undefined}
          required
        />
        <Botao type="submit" larguraTotal carregando={pendente}>
          Continuar
        </Botao>
      </form>
    </Moldura>
  );
}
