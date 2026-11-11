"use client";

// Configurações do livro (prompt 6): a confirmação do processamento com IA (P41), enquanto
// faltar, e os nomes de pessoas e lugares que a IA sugere a partir das histórias.
import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Seletor } from "@/components/ui/seletor";
import type { NomeDaTela } from "@/lib/historias/tipos";
import type { LivroDaTela, Resposta } from "@/lib/livro/tipos";

export type AcoesConfiguracoes = {
  confirmarIA: () => Promise<Resposta>;
  ajustar: (
    id: string,
    m: { estado?: "aceito" | "recusado"; nome?: string },
  ) => Promise<Resposta>;
  acrescentar: (n: { tipo: "pessoa" | "lugar"; nome: string }) => Promise<Resposta>;
};

const TIPO = { pessoa: "Pessoa", lugar: "Lugar" } as const;

function ConfirmarIA({
  livro,
  confirmar,
}: {
  livro: LivroDaTela;
  confirmar: AcoesConfiguracoes["confirmarIA"];
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  if (!livro.ehResponsavel)
    return (
      <section className="rounded-cartao bg-papel border-linha flex flex-col gap-3 border p-5">
        <p className="text-ui-17 text-tinta">
          Quem comprou o livro precisa confirmar antes da primeira história.
        </p>
      </section>
    );
  return (
    <section
      id="ia"
      className="rounded-cartao bg-papel border-floresta/30 flex flex-col gap-4 border p-5"
    >
      <h2 className="font-livro text-livro-24 text-tinta leading-snug">
        Antes da primeira história
      </h2>
      <p className="text-ui-17 text-tinta">
        {livro.autor} sabe que as gravações vão ser transcritas e escritas com
        ajuda de inteligência artificial, por serviços fora do Brasil
        (ElevenLabs e Anthropic)?
      </p>
      <Botao
        larguraTotal
        carregando={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await confirmar();
            setErro(r.ok ? null : r.mensagem);
          })
        }
      >
        Sim, pode processar
      </Botao>
      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
    </section>
  );
}

function LinhaNome({
  n,
  acoes,
  podeEscrever,
}: {
  n: NomeDaTela;
  acoes: AcoesConfiguracoes;
  podeEscrever: boolean;
}) {
  const [corrigindo, setCorrigindo] = useState(false);
  const [valor, setValor] = useState(n.nome);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const rodar = (f: () => Promise<Resposta>, depois?: () => void) =>
    iniciar(async () => {
      const r = await f();
      setErro(r.ok ? null : r.mensagem);
      if (r.ok) depois?.();
    });

  if (corrigindo)
    return (
      <li className="flex flex-col gap-3 py-4">
        <Campo
          rotulo={`${TIPO[n.tipo]}: grafia certa`}
          value={valor}
          maxLength={80}
          autoFocus
          onChange={(e) => setValor(e.target.value)}
        />
        <div className="flex gap-3">
          <Botao
            carregando={pendente}
            onClick={() =>
              rodar(() => acoes.ajustar(n.id, { nome: valor }), () => setCorrigindo(false))
            }
          >
            Salvar
          </Botao>
          <Botao variante="secundario" onClick={() => setCorrigindo(false)}>
            Cancelar
          </Botao>
        </div>
        {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
      </li>
    );

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-livro text-livro-20 text-tinta [overflow-wrap:anywhere]">
          {n.nome}
        </p>
        <span className="text-ui-13 text-tinta-2 shrink-0">{TIPO[n.tipo]}</span>
      </div>
      {podeEscrever ? (
        <div className="flex flex-wrap gap-2">
          {n.estado === "sugerido" ? (
            <Botao
              carregando={pendente}
              onClick={() => rodar(() => acoes.ajustar(n.id, { estado: "aceito" }))}
            >
              Aceitar
            </Botao>
          ) : null}
          <Botao variante="secundario" onClick={() => setCorrigindo(true)}>
            Corrigir
          </Botao>
          {n.estado === "sugerido" ? (
            <Botao
              variante="secundario"
              onClick={() => rodar(() => acoes.ajustar(n.id, { estado: "recusado" }))}
            >
              Não é nome
            </Botao>
          ) : null}
        </div>
      ) : null}
      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
    </li>
  );
}

function Acrescentar({
  acrescentar,
  aberto: abertoInicial = false,
}: {
  acrescentar: AcoesConfiguracoes["acrescentar"];
  aberto?: boolean;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const [tipo, setTipo] = useState<"pessoa" | "lugar">("pessoa");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  if (!aberto)
    return (
      <Botao variante="secundario" onClick={() => setAberto(true)} className="self-start">
        Acrescentar nome
      </Botao>
    );
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await acrescentar({ tipo, nome });
          setErro(r.ok ? null : r.mensagem);
          if (r.ok) {
            setNome("");
            setAberto(false);
          }
        });
      }}
    >
      <Seletor
        rotulo="É"
        value={tipo}
        onChange={(e) => setTipo(e.target.value as "pessoa" | "lugar")}
        opcoes={[
          { valor: "pessoa", rotulo: "Pessoa" },
          { valor: "lugar", rotulo: "Lugar" },
        ]}
      />
      <Campo
        rotulo="Nome, como deve ser escrito"
        value={nome}
        maxLength={80}
        onChange={(e) => setNome(e.target.value)}
      />
      <Botao type="submit" carregando={pendente} className="self-start">
        Acrescentar
      </Botao>
      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
    </form>
  );
}

export function TelaConfiguracoes({
  livro,
  nomes,
  acoes,
}: {
  livro: LivroDaTela;
  nomes: NomeDaTela[];
  acoes: AcoesConfiguracoes;
}) {
  const sugeridos = nomes.filter((n) => n.estado === "sugerido");
  const aceitos = nomes.filter((n) => n.estado === "aceito");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12">
      <Link
        href={`/livro/${livro.id}`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Livro do {livro.autor}
      </Link>
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        Configurações
      </h1>

      {!livro.iaConfirmada && livro.podeEscrever ? (
        <ConfirmarIA livro={livro} confirmar={acoes.confirmarIA} />
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-ui-20 text-tinta font-medium">Nomes do livro</h2>
          <p className="text-ui-15 text-tinta-2">
            A IA escreve estes nomes do jeito que estão aqui.
          </p>
        </div>
        {nomes.length === 0 ? (
          <EstadoVazio
            frase="Os nomes aparecem aqui depois da primeira história."
            acao={
              livro.podeEscrever ? <Acrescentar acrescentar={acoes.acrescentar} /> : null
            }
          />
        ) : (
          <>
            {sugeridos.length ? (
              <div className="flex flex-col">
                <h3 className="text-ui-15 text-tinta-2 font-medium">
                  Sugeridos pela IA
                </h3>
                <ul className="divide-linha divide-y">
                  {sugeridos.map((n) => (
                    <LinhaNome key={n.id} n={n} acoes={acoes} podeEscrever={livro.podeEscrever} />
                  ))}
                </ul>
              </div>
            ) : null}
            {aceitos.length ? (
              <div className="flex flex-col">
                <h3 className="text-ui-15 text-tinta-2 font-medium">Confirmados</h3>
                <ul className="divide-linha divide-y">
                  {aceitos.map((n) => (
                    <LinhaNome key={n.id} n={n} acoes={acoes} podeEscrever={livro.podeEscrever} />
                  ))}
                </ul>
              </div>
            ) : null}
            {livro.podeEscrever ? <Acrescentar acrescentar={acoes.acrescentar} /> : null}
          </>
        )}
      </section>
    </main>
  );
}
