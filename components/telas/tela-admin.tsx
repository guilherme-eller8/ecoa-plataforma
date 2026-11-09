"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Marca } from "@/components/ui/marca";
import type { AcaoFormulario, Resultado } from "@/lib/resultado";
import type { PasseEstado } from "@/lib/supabase/tipos";

export type LinhaAdmin = {
  id: string;
  autorNome: string | null;
  email: string | null;
  estado: PasseEstado;
  venceEm: string | null;
};

type Props = {
  livros: LinhaAdmin[];
  ativar: AcaoFormulario;
  renovar: AcaoFormulario;
  reenviar: AcaoFormulario;
};

const ROTULO_ESTADO: Record<PasseEstado, string> = {
  ativo: "Ativo",
  somente_leitura: "Somente leitura",
  pendente: "Pendente",
};

const data = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(iso))
    : "—";

export function TelaAdmin({ livros, ativar, renovar, reenviar }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-10 px-5 pt-8 pb-16 md:px-10">
      <header className="flex items-baseline justify-between gap-4">
        <Marca />
        <span className="font-ui text-tinta-2 text-[15px]">Admin</span>
      </header>

      <FormularioAtivar ativar={ativar} />

      <section aria-labelledby="titulo-livros" className="flex flex-col gap-4">
        <h2
          id="titulo-livros"
          className="font-ui text-tinta text-[17px] font-semibold"
        >
          Livros{" "}
          <span className="text-tinta-2 font-normal tabular-nums">
            {livros.length}
          </span>
        </h2>
        {livros.length === 0 ? (
          <p className="font-ui text-tinta-2 text-[16px]">
            Nenhum passe ativado ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {livros.map((livro) => (
              <LinhaLivro
                key={livro.id}
                livro={livro}
                renovar={renovar}
                reenviar={reenviar}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function FormularioAtivar({ ativar }: { ativar: AcaoFormulario }) {
  const [email, setEmail] = useState("");
  const [autor, setAutor] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, enviar, enviando] = useActionState(
    async (anterior: Resultado | null, dados: FormData) => {
      const r = await ativar(anterior, dados);
      setConfirmando(false);
      if (r?.ok) {
        setEmail("");
        setAutor("");
      }
      return r;
    },
    null,
  );

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <section
      aria-labelledby="titulo-ativar"
      className="bg-papel flex flex-col gap-5 rounded-3xl p-6 md:p-8"
    >
      <h1
        id="titulo-ativar"
        className="font-ui text-tinta text-[24px] font-semibold"
      >
        Ativar passe
      </h1>
      <form action={enviar} className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Campo
            rotulo="E-mail de quem comprou"
            nome="email"
            type="email"
            autoComplete="off"
            inputMode="email"
            required
            value={email}
            readOnly={confirmando}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Campo
            rotulo="Nome do autor (opcional)"
            nome="autor_nome"
            autoComplete="off"
            value={autor}
            readOnly={confirmando}
            onChange={(e) => setAutor(e.target.value)}
          />
        </div>

        {!confirmando ? (
          <Botao
            type="button"
            disabled={!emailValido}
            onClick={() => setConfirmando(true)}
            className="self-start"
          >
            Ativar passe
          </Botao>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="font-ui text-tinta text-[17px]">
              Ativar para{" "}
              <strong className="font-semibold break-all">
                {email.trim()}
              </strong>
              ?
            </p>
            <div className="flex flex-wrap gap-3">
              <Botao type="submit" carregando={enviando}>
                Confirmar e enviar e-mail
              </Botao>
              <Botao
                type="button"
                variante="texto"
                disabled={enviando}
                onClick={() => setConfirmando(false)}
              >
                Corrigir
              </Botao>
            </div>
          </div>
        )}
        {resultado && <Aviso ok={resultado.ok}>{resultado.mensagem}</Aviso>}
      </form>
    </section>
  );
}

function LinhaLivro({
  livro,
  renovar,
  reenviar,
}: {
  livro: LinhaAdmin;
  renovar: AcaoFormulario;
  reenviar: AcaoFormulario;
}) {
  const [confirmarRenovar, setConfirmarRenovar] = useState(false);
  const [resultadoRenovar, enviarRenovar, renovando] = useActionState(
    async (anterior: Resultado | null, dados: FormData) => {
      const r = await renovar(anterior, dados);
      setConfirmarRenovar(false);
      return r;
    },
    null,
  );
  const [resultadoReenviar, enviarReenviar, reenviando] = useActionState(
    reenviar,
    null,
  );
  const resultado = resultadoRenovar ?? resultadoReenviar;

  return (
    <li className="bg-papel flex flex-col gap-4 rounded-2xl p-5 md:grid md:grid-cols-[1.4fr_1fr_auto] md:items-center md:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-livro text-tinta truncate text-[20px]">
          {livro.autorNome ?? "Autor sem nome"}
        </span>
        <span className="font-ui text-tinta-2 truncate text-[15px]">
          {livro.email ?? "—"}
        </span>
      </div>
      <div className="font-ui flex flex-col gap-1 text-[15px]">
        <span
          className={
            livro.estado === "ativo"
              ? "text-floresta font-semibold"
              : "font-semibold text-[#7a2e14]"
          }
        >
          {ROTULO_ESTADO[livro.estado]}
        </span>
        <span className="text-tinta-2 tabular-nums">
          Vence em {data(livro.venceEm)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <form action={enviarRenovar}>
          <input type="hidden" name="livro_id" value={livro.id} />
          {confirmarRenovar ? (
            <Botao
              type="submit"
              variante="principal"
              carregando={renovando}
              className="min-h-12 px-5 text-[16px]"
            >
              Confirmar +12 meses
            </Botao>
          ) : (
            <Botao
              type="button"
              variante="secundario"
              onClick={() => setConfirmarRenovar(true)}
              className="bg-polen min-h-12 px-5 text-[16px]"
            >
              Renovar
            </Botao>
          )}
        </form>
        <form action={enviarReenviar}>
          <input type="hidden" name="livro_id" value={livro.id} />
          <Botao type="submit" variante="texto" carregando={reenviando}>
            Reenviar acesso
          </Botao>
        </form>
      </div>
      {resultado ? (
        <div className="md:col-span-3">
          <Aviso ok={resultado.ok}>{resultado.mensagem}</Aviso>
        </div>
      ) : null}
    </li>
  );
}
