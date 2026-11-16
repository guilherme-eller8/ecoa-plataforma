// Admin → Aderência → um livro (prompt 15, aceite da M10): o cliente (plano, uso e custo de IA,
// Evals 1A), quem entrou por dia nos últimos 14 dias e a linha do tempo do que cada um fez.
// Sem texto de pessoa, só ações, datas e números.
import Link from "next/link";
import { frase, PAPEL_ROTULO } from "@/lib/aderencia/rotulos";
import {
  PASSOS_ONBOARDING,
  type LinhaDeAderencia,
} from "@/lib/aderencia/calculo";
import type {
  AcaoDaLinhaDoTempo,
  DadosDoCliente,
  PessoaDoLivro,
} from "@/lib/aderencia/dados";
import { emReais, formatarReais } from "@/lib/ai/custo";
import { ROTULO_PLANO } from "@/lib/plano";
import { Numero } from "./admin-numero";
import { ADERENCIA_DIAS_ACESSO } from "@/lib/config";
import {
  BarrasDeGravacao,
  estadoDoAutor,
  quandoParado,
} from "./tela-aderencia";
import { CabecalhoAdmin } from "./admin-cabecalho";

const apoio = "font-ui text-tinta-2 text-[15px]";

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));

const diaCurto = (dia: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric" }).format(
    new Date(`${dia}T12:00:00-03:00`),
  );

const data = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(iso))
    : "—";

function BlocoDoCliente({ c }: { c: DadosDoCliente }) {
  const reais = emReais(c.custoUSD);
  return (
    <section aria-labelledby="titulo-cliente" className="flex flex-col gap-3">
      <h2
        id="titulo-cliente"
        className="font-ui text-tinta text-[17px] font-semibold"
      >
        Cliente
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Numero
          rotulo="Plano"
          valor={ROTULO_PLANO[c.plano]}
          detalhe={c.venceEm ? `vence ${data(c.venceEm)}` : "sem vencimento"}
          alerta={c.plano !== "ativo"}
        />
        <Numero
          rotulo="Histórias prontas"
          valor={String(c.prontas)}
          detalhe={`${c.revisadas} revisadas`}
        />
        <Numero
          rotulo="Áudio processado"
          valor={`${Math.round(c.minutos)} min`}
          detalhe={
            c.membros === 1
              ? "1 pessoa com login"
              : `${c.membros} pessoas com login`
          }
        />
        <Numero
          rotulo="Custo de IA"
          valor={formatarReais(reais)}
          detalhe={
            c.minutos > 0
              ? `${formatarReais(reais / c.minutos)}/min · ${c.falhas} falhas`
              : `${c.falhas} falhas`
          }
        />
      </div>
      <p className={apoio}>
        Criado em {data(c.criadoEm)} · Plano ativado em {data(c.ativadoEm)} ·{" "}
        {c.consentiuIaEm
          ? `IA confirmada em ${data(c.consentiuIaEm)}`
          : "IA ainda não confirmada"}
      </p>
    </section>
  );
}

export function TelaAderenciaLivro({
  autorNome,
  email,
  cliente,
  linha,
  pessoas,
  linhaDoTempo,
}: {
  autorNome: string | null;
  email: string | null;
  cliente?: DadosDoCliente;
  linha: LinhaDeAderencia;
  pessoas: PessoaDoLivro[];
  linhaDoTempo: AcaoDaLinhaDoTempo[];
}) {
  const passo =
    linha.passo.atual === null
      ? "5 passos feitos"
      : `Passo ${linha.passo.atual + 1} de 5 · ${PASSOS_ONBOARDING[linha.passo.atual]}`;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 pt-8 pb-16 md:px-10">
      <CabecalhoAdmin aba="aderencia" />

      <div className="flex flex-col gap-2">
        <Link
          href="/admin/aderencia"
          className="font-ui text-floresta min-h-11 text-[16px] underline-offset-4 hover:underline"
        >
          ← Todos os livros
        </Link>
        <h1 className="font-ui text-tinta text-[22px] font-semibold">
          {autorNome ?? "(sem nome)"}
        </h1>
        <p className={`${apoio} break-all`}>{email ?? "sem responsável"}</p>
        <p className={apoio}>{passo}</p>
        <p className={apoio}>
          {linha.parado ? "Parado" : "Mexeu"} {quandoParado(linha.paradoHaDias)}{" "}
          · {estadoDoAutor(linha)}
        </p>
        <BarrasDeGravacao semanas={linha.semanas} />
      </div>

      {cliente ? <BlocoDoCliente c={cliente} /> : null}

      <section aria-labelledby="titulo-acessos" className="flex flex-col gap-3">
        <h2
          id="titulo-acessos"
          className="font-ui text-tinta text-[17px] font-semibold"
        >
          Quem entrou nos últimos {ADERENCIA_DIAS_ACESSO} dias
        </h2>
        {pessoas.length === 0 ? (
          <p className={apoio}>Ninguém entrou ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pessoas.map((p) => (
              <li
                key={p.chave}
                className="bg-papel flex flex-col gap-2 rounded-2xl p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-ui text-tinta text-[16px] font-medium break-all">
                    {p.nome}
                  </span>
                  <span className={apoio}>
                    {PAPEL_ROTULO[p.papel] ?? p.papel}
                  </span>
                </div>
                <p className={apoio}>
                  {p.dias.length === 0
                    ? `Nenhum dia na janela · último acesso ${p.ultimo ? quando(p.ultimo) : "—"}`
                    : `${p.dias.length} ${p.dias.length === 1 ? "dia" : "dias"}: ${p.dias.map(diaCurto).join(", ")}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-tempo" className="flex flex-col gap-3">
        <h2
          id="titulo-tempo"
          className="font-ui text-tinta text-[17px] font-semibold"
        >
          O que aconteceu{" "}
          <span className="text-tinta-2 font-normal tabular-nums">
            {linhaDoTempo.length}
          </span>
        </h2>
        {linhaDoTempo.length === 0 ? (
          <p className={apoio}>Nada registrado.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {linhaDoTempo.map((e, i) => (
              <li
                key={i}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
              >
                <span className="font-ui text-tinta text-[16px]">
                  {frase(e.acao)}{" "}
                  <span className="text-tinta-2">· {e.nome}</span>
                </span>
                <span className={`${apoio} tabular-nums`}>
                  {quando(e.criado_em)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
