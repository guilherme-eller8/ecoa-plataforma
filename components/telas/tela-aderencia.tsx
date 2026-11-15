// Admin → Aderência (prompt 15): o funil no topo e uma linha por livro, do mais parado para o
// menos. Só ids e contagens (T23). Sem estado: recebe tudo por props.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import {
  PASSOS_ONBOARDING,
  type Funil,
  type LinhaDeAderencia,
  type SemanaDeGravacoes,
} from "@/lib/aderencia/calculo";
import { ADERENCIA_SEMANAS, LIVRO_PARADO_DIAS } from "@/lib/config";
import { type AbaAdmin, CabecalhoAdmin } from "./admin-cabecalho";

const apoio = "font-ui text-tinta-2 text-[15px]";

export const quandoParado = (dias: number) =>
  dias === 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;

export function estadoDoAutor(
  l: Pick<LinhaDeAderencia, "autorApareceu" | "autorGravou">,
) {
  if (l.autorGravou) return "Autor já gravou";
  if (l.autorApareceu) return "Autor abriu o link, ainda não gravou";
  return "Autor ainda não abriu o link";
}

function Degrau({
  rotulo,
  valor,
  total,
}: {
  rotulo: string;
  valor: number | null;
  total: number;
}) {
  return (
    <div className="bg-papel flex flex-col gap-1 rounded-2xl p-4">
      <span className="font-ui text-tinta text-[28px] leading-none font-semibold tabular-nums">
        {valor === null ? "—" : valor}
        {valor !== null ? (
          <span className="text-tinta-2 text-[15px] font-normal">
            {" "}
            / {total}
          </span>
        ) : null}
      </span>
      <span className={apoio}>{rotulo}</span>
    </div>
  );
}

/** Barras das últimas semanas, da mais antiga (esquerda) para a mais recente (direita). */
export function BarrasDeGravacao({
  semanas,
}: {
  semanas: SemanaDeGravacoes[];
}) {
  const maximo = Math.max(1, ...semanas.map((s) => s.autor + s.membros));
  const total = semanas.reduce((n, s) => n + s.autor + s.membros, 0);
  const doAutor = semanas.reduce((n, s) => n + s.autor, 0);
  return (
    <div className="flex flex-col gap-1">
      <div
        role="img"
        aria-label={`Gravações nas últimas ${semanas.length} semanas: ${total}, ${doAutor} do autor`}
        className="flex h-10 items-end gap-1"
      >
        {[...semanas].reverse().map((s, i) => {
          const n = s.autor + s.membros;
          return (
            <div
              key={i}
              className="bg-polen-2 flex h-full flex-1 flex-col justify-end rounded-sm"
            >
              {n === 0 ? null : (
                <>
                  <div
                    className="bg-linha-forte"
                    style={{ height: `${(s.membros / maximo) * 100}%` }}
                  />
                  <div
                    className="bg-floresta"
                    style={{ height: `${(s.autor / maximo) * 100}%` }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
      <div
        className="font-ui text-tinta-2 flex justify-between text-[13px]"
        aria-hidden="true"
      >
        <span>{semanas.length} sem. atrás</span>
        <span>esta semana</span>
      </div>
    </div>
  );
}

function CartaoDoLivro({ l }: { l: LinhaDeAderencia }) {
  const passo =
    l.passo.atual === null
      ? "5 passos feitos"
      : `Passo ${l.passo.atual + 1} de 5 · ${PASSOS_ONBOARDING[l.passo.atual]}`;
  return (
    <li>
      <Link
        href={`/admin/aderencia/${l.id}`}
        className="bg-papel hover:bg-polen-2 flex flex-col gap-3 rounded-2xl p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-ui text-tinta text-[17px] font-semibold">
            {l.autorNome ?? "(sem nome)"}
          </span>
          <span
            className={`font-ui rounded-full px-3 py-1 text-[14px] ${
              l.parado
                ? "bg-aviso-fundo text-aviso font-semibold"
                : "bg-floresta-claro text-floresta"
            }`}
          >
            {l.parado
              ? `Parado ${quandoParado(l.paradoHaDias)}`
              : `Mexeu ${quandoParado(l.paradoHaDias)}`}
          </span>
        </div>
        <p className={apoio}>{passo}</p>
        <p className={`${apoio} ${l.autorGravou ? "" : "text-tinta"}`}>
          {estadoDoAutor(l)}
        </p>
        <BarrasDeGravacao semanas={l.semanas} />
      </Link>
    </li>
  );
}

export function TelaAderencia({
  linhas,
  funil,
  truncado = false,
}: {
  linhas: LinhaDeAderencia[];
  funil: Funil;
  truncado?: boolean;
}) {
  const aba: AbaAdmin = "aderencia";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 pt-8 pb-16 md:px-10">
      <CabecalhoAdmin aba={aba} titulo="Aderência dos livros" />

      {linhas.length === 0 ? (
        <EstadoVazio
          frase="Nenhum livro ainda."
          acao={
            <Link href="/admin" className={classesDoBotao()}>
              Ativar um plano
            </Link>
          }
        />
      ) : (
        <>
          <section
            aria-labelledby="titulo-funil"
            className="flex flex-col gap-3"
          >
            <h2
              id="titulo-funil"
              className="font-ui text-tinta text-[17px] font-semibold"
            >
              Funil
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Degrau
                rotulo="Configurou"
                valor={funil.configurou}
                total={funil.livros}
              />
              <Degrau
                rotulo="1ª história"
                valor={funil.primeiraHistoria}
                total={funil.livros}
              />
              <Degrau
                rotulo="5 histórias"
                valor={funil.cincoHistorias}
                total={funil.livros}
              />
              <Degrau
                rotulo="Publicado"
                valor={funil.publicado}
                total={funil.livros}
              />
            </div>
          </section>

          <section
            aria-labelledby="titulo-livros-aderencia"
            className="flex flex-col gap-3"
          >
            <h2
              id="titulo-livros-aderencia"
              className="font-ui text-tinta text-[17px] font-semibold"
            >
              Livros{" "}
              <span className="text-tinta-2 font-normal tabular-nums">
                {linhas.length}
              </span>
            </h2>
            <p className={apoio}>
              Parado = {LIVRO_PARADO_DIAS} dias ou mais sem ação de pessoa.
              Barras: gravações por semana nas últimas {ADERENCIA_SEMANAS}{" "}
              (verde, do autor; cinza, de quem ajuda).
            </p>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {linhas.map((l) => (
                <CartaoDoLivro key={l.id} l={l} />
              ))}
            </ul>
          </section>
          {truncado ? (
            <p className={apoio}>
              Mostrando só os eventos mais recentes: o histórico passou do teto
              de leitura.
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
