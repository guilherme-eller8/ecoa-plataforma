// Admin → Evals → Adoção (fase 1A). Primeiro quem precisa de conversa (a ação), depois os
// números. Só ids e contagens (T23). Sem estado: recebe tudo por props.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import type { Funil } from "@/lib/aderencia/calculo";
import { PAPEL_ROTULO } from "@/lib/aderencia/rotulos";
import {
  ATIVACAO_DIAS,
  META_ATIVACAO,
  META_HORAS_PRIMEIRA_PRONTA,
  META_LIVROS_ATIVOS,
  META_RETENCAO_S4,
  RETENCAO_SEMANAS,
} from "@/lib/config";
import type { Coorte } from "@/lib/evals/adocao";
import type { Taxa } from "@/lib/evals/custo";
import { CabecalhoAdmin } from "./admin-cabecalho";
import {
  AbasEvals,
  apoio,
  Numero,
  pct,
  textoDaTaxa,
  tituloSecao,
} from "./admin-numero";

export type LivroParaConversar = {
  id: string;
  autorNome: string | null;
  motivo: string;
};

export type DadosAdocao = {
  livros: number;
  ativos: Taxa;
  ativacao: { taxa: Taxa; emAndamento: number };
  primeiraPronta: { mediana: number | null; n: number };
  retencaoS4: Taxa;
  coortes: Coorte[];
  funil: Funil;
  quem: { papel: string; acoes: number }[];
  valor: {
    revisadas: number;
    publicados: number;
    qrTocados: number;
    compartilhadas: number;
  };
  conversar: LivroParaConversar[];
};

const abaixo = (t: Taxa, meta: number) => t.fracao !== null && t.fracao < meta;
const diaMes = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

function NumeroDaTaxa({
  rotulo,
  taxa,
  meta,
}: {
  rotulo: string;
  taxa: Taxa;
  meta: number;
}) {
  const { valor, detalhe } = textoDaTaxa(taxa);
  return (
    <Numero
      rotulo={rotulo}
      valor={valor}
      detalhe={`${detalhe} · meta ${pct(meta)}`}
      alerta={abaixo(taxa, meta)}
    />
  );
}

export function TelaEvalsAdocao({ dados }: { dados: DadosAdocao }) {
  const horas = dados.primeiraPronta.mediana;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 pt-8 pb-16 md:px-10">
      <CabecalhoAdmin aba="evals" titulo="Evals" />
      <AbasEvals atual="adocao" />

      {dados.livros === 0 ? (
        <EstadoVazio
          frase="Nenhum livro com plano ativo ainda."
          acao={
            <Link href="/admin" className={classesDoBotao()}>
              Ativar um plano
            </Link>
          }
        />
      ) : (
        <>
          <section
            aria-labelledby="t-conversar"
            className="flex flex-col gap-3"
          >
            <h2 id="t-conversar" className={tituloSecao}>
              Livros para conversar{" "}
              <span className="text-tinta-2 font-normal tabular-nums">
                {dados.conversar.length}
              </span>
            </h2>
            {dados.conversar.length === 0 ? (
              <p className={apoio}>Todos os livros andando.</p>
            ) : (
              <ul className="*:bg-papel flex flex-col gap-1 *:overflow-hidden *:rounded-xl">
                {dados.conversar.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/admin/aderencia/${l.id}`}
                      className="hover:bg-polen-2 flex flex-col gap-1 px-4 py-3"
                    >
                      <span className="font-ui text-tinta text-[17px] font-semibold">
                        {l.autorNome ?? "(sem nome)"}
                      </span>
                      <span className="font-ui text-aviso text-[15px]">
                        {l.motivo}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="t-numeros" className="flex flex-col gap-3">
            <h2 id="t-numeros" className={tituloSecao}>
              Uso
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <NumeroDaTaxa
                rotulo="Livros ativos na semana"
                taxa={dados.ativos}
                meta={META_LIVROS_ATIVOS}
              />
              <NumeroDaTaxa
                rotulo={`1ª história revisada em ${ATIVACAO_DIAS} dias`}
                taxa={dados.ativacao.taxa}
                meta={META_ATIVACAO}
              />
              <Numero
                rotulo="Até a 1ª história pronta"
                valor={horas === null ? "—" : `${Math.round(horas)} h`}
                detalhe={`mediana de ${dados.primeiraPronta.n} · meta ${META_HORAS_PRIMEIRA_PRONTA} h`}
                alerta={horas !== null && horas > META_HORAS_PRIMEIRA_PRONTA}
              />
              <NumeroDaTaxa
                rotulo={`Ativos na semana ${RETENCAO_SEMANAS}`}
                taxa={dados.retencaoS4}
                meta={META_RETENCAO_S4}
              />
            </div>
            {dados.ativacao.emAndamento ? (
              <p className={apoio}>
                {dados.ativacao.emAndamento === 1
                  ? "1 livro ainda está"
                  : `${dados.ativacao.emAndamento} livros ainda estão`}{" "}
                dentro dos {ATIVACAO_DIAS} dias de ativação.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="t-funil" className="flex flex-col gap-3">
            <h2 id="t-funil" className={tituloSecao}>
              Funil até publicar
            </h2>
            <ol className="font-ui *:bg-papel flex flex-col gap-1 text-[16px] *:overflow-hidden *:rounded-xl">
              {[
                ["Livros", dados.funil.livros],
                ["Configurou", dados.funil.configurou],
                ["1ª história pronta", dados.funil.primeiraHistoria],
                ["5 histórias prontas", dados.funil.cincoHistorias],
                ["Publicou", dados.funil.publicado ?? 0],
              ].map(([rotulo, n]) => (
                <li
                  key={rotulo}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="text-tinta">{rotulo}</span>
                  <span className="text-tinta tabular-nums">{n}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="t-coorte" className="flex flex-col gap-3">
            <h2 id="t-coorte" className={tituloSecao}>
              Retenção por semana de ativação
            </h2>
            <div className="bg-papel overflow-x-auto rounded-2xl">
              <table className="font-ui w-full text-[15px] tabular-nums">
                <thead>
                  <tr className="text-tinta-2 text-left">
                    <th scope="col" className="px-4 py-3 font-normal">
                      Semana
                    </th>
                    <th scope="col" className="px-2 py-3 font-normal">
                      Livros
                    </th>
                    {Array.from({ length: RETENCAO_SEMANAS }, (_, i) => (
                      <th
                        key={i}
                        scope="col"
                        className="px-2 py-3 text-right font-normal"
                      >
                        S{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.coortes.map((c) => (
                    <tr key={c.semana} className="text-tinta">
                      <th
                        scope="row"
                        className="px-4 py-3 text-left font-normal"
                      >
                        {diaMes(c.semana)}
                      </th>
                      <td className="px-2 py-3">{c.livros}</td>
                      {c.semanas.map((s, i) => (
                        <td key={i} className="px-2 py-3 text-right">
                          {s === null
                            ? "—"
                            : s.fracao === null
                              ? `${s.n}/${s.de}`
                              : pct(s.fracao)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={apoio}>
              Ativo = gravou, subiu áudio, editou, enviou pergunta, revisou ou
              montou. Abrir o link não conta.
            </p>
          </section>

          <section aria-labelledby="t-quem" className="flex flex-col gap-3">
            <h2 id="t-quem" className={tituloSecao}>
              Quem mantém o livro vivo (30 dias)
            </h2>
            <ul className="font-ui *:bg-papel flex flex-col gap-1 text-[16px] *:overflow-hidden *:rounded-xl">
              {dados.quem.map((q) => (
                <li
                  key={q.papel}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="text-tinta">
                    {PAPEL_ROTULO[q.papel] ?? q.papel}
                  </span>
                  <span className="text-tinta tabular-nums">
                    {q.acoes} ações
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="t-valor" className="flex flex-col gap-3">
            <h2 id="t-valor" className={tituloSecao}>
              O que chegou à família (30 dias)
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Numero
                rotulo="Histórias revisadas"
                valor={String(dados.valor.revisadas)}
              />
              <Numero
                rotulo="Livros publicados"
                valor={String(dados.valor.publicados)}
              />
              <Numero
                rotulo="QR tocados"
                valor={String(dados.valor.qrTocados)}
              />
              <Numero
                rotulo="Compartilhadas ouvidas"
                valor={String(dados.valor.compartilhadas)}
              />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
