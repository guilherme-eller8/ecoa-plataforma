// Admin → Evals → Custo e tempo (fase 1A, docs/designs/evals.md). Só números e códigos, nunca
// texto de história (P68). Sem estado: recebe tudo por props, já somado pelo banco.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { emReais, formatarReais } from "@/lib/ai/custo";
import {
  ALERTA_PERDA_FALHAS,
  FILA_PARADA_MIN,
  META_CUSTO_LIVRO_BRL,
  META_CUSTO_MIN_BRL,
  PREMISSA_HISTORIAS_POR_LIVRO,
  PREMISSA_MIN_AUDIO_POR_HISTORIA,
} from "@/lib/config";
import {
  GRUPOS,
  type FaixaDeEspera,
  type Grupo,
  type LinhaDeProjecao,
  type ResumoDeCusto,
  type SemanaDeGasto,
} from "@/lib/evals/custo";
import { CabecalhoAdmin } from "./admin-cabecalho";
import {
  AbasEvals,
  AMOSTRA_PEQUENA,
  apoio,
  Numero,
  pct,
  tituloSecao,
} from "./admin-numero";

export type DadosCusto = {
  dias: number;
  historias: number;
  resumo: ResumoDeCusto;
  semanas: SemanaDeGasto[];
  projecao: LinhaDeProjecao[] | null;
  faixas: (FaixaDeEspera & { rotulo: string })[];
  falhas: { codigo: string; etapa: string; vezes: number }[];
};

const reais = (usd: number) => formatarReais(emReais(usd));
const centavos = (usd: number) =>
  `R$ ${emReais(usd).toFixed(3).replace(".", ",")}`;
const segundos = (ms: number | null) =>
  ms === null
    ? "—"
    : ms < 60_000
      ? `${Math.round(ms / 1000)} s`
      : `${(ms / 60_000).toFixed(1).replace(".", ",")} min`;
const diaMes = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

const COR: Record<Grupo, string> = {
  transcricao: "bg-linha-forte",
  escrita: "bg-floresta",
  pedidos: "bg-aviso",
  divisao: "bg-tinta-2",
  outras: "bg-linha",
};
const ROTULO: Record<Grupo, string> = {
  transcricao: "Transcrição",
  escrita: "Escrita",
  pedidos: "Pedidos à IA",
  divisao: "Divisão",
  outras: "Outras",
};

function BarrasDeGasto({ semanas }: { semanas: SemanaDeGasto[] }) {
  const total = (s: SemanaDeGasto) => GRUPOS.reduce((t, g) => t + s[g], 0);
  const maximo = Math.max(...semanas.map(total), 1e-9);
  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`Gasto por semana: ${semanas
          .map((s) => `${diaMes(s.semana)} ${reais(total(s))}`)
          .join(", ")}`}
        className="flex h-32 items-end gap-1"
      >
        {semanas.map((s) => (
          <div
            key={s.semana}
            className="bg-polen-2 flex h-full flex-1 flex-col-reverse rounded-sm"
          >
            {GRUPOS.map((g) =>
              s[g] > 0 ? (
                <div
                  key={g}
                  className={COR[g]}
                  style={{ height: `${(s[g] / maximo) * 100}%` }}
                />
              ) : null,
            )}
          </div>
        ))}
      </div>
      <div
        className="font-ui text-tinta-2 flex justify-between text-[13px]"
        aria-hidden="true"
      >
        <span>{diaMes(semanas[0].semana)}</span>
        <span>esta semana</span>
      </div>
      <ul className="font-ui text-tinta-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
        {GRUPOS.filter((g) => semanas.some((s) => s[g] > 0)).map((g) => (
          <li key={g} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`${COR[g]} inline-block size-3 rounded-sm`}
            />
            {ROTULO[g]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TelaEvals({ dados }: { dados: DadosCusto }) {
  const { resumo: r } = dados;
  const porMinBRL = r.porMinutoUSD === null ? null : emReais(r.porMinutoUSD);
  const pequena = AMOSTRA_PEQUENA(dados.historias);
  const paradas = dados.faixas.reduce((t, f) => t + f.paradas, 0);
  const minutosLivro =
    PREMISSA_HISTORIAS_POR_LIVRO * PREMISSA_MIN_AUDIO_POR_HISTORIA;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 pt-8 pb-16 md:px-10">
      <CabecalhoAdmin aba="evals" titulo="Evals" />
      <AbasEvals atual="custo" />

      {r.chamadas === 0 ? (
        <EstadoVazio
          frase={`Nenhum uso de IA nos últimos ${dados.dias} dias.`}
          acao={
            <Link href="/admin" className={classesDoBotao()}>
              Ver os livros
            </Link>
          }
        />
      ) : (
        <>
          <section aria-labelledby="t-30" className="flex flex-col gap-3">
            <h2 id="t-30" className={tituloSecao}>
              Últimos {dados.dias} dias
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Numero
                rotulo="Gasto"
                valor={reais(r.gastoUSD)}
                detalhe={`${r.chamadas} chamadas`}
              />
              <Numero
                rotulo="Por minuto de áudio"
                valor={porMinBRL === null ? "—" : centavos(r.porMinutoUSD!)}
                detalhe={`meta ${formatarReais(META_CUSTO_MIN_BRL)} · ${Math.round(r.minutos)} min`}
                alerta={porMinBRL !== null && porMinBRL > META_CUSTO_MIN_BRL}
              />
              <Numero
                rotulo="Por história"
                valor={
                  r.porHistoriaUSD === null ? "—" : reais(r.porHistoriaUSD)
                }
                detalhe={
                  pequena
                    ? `amostra pequena · ${dados.historias}`
                    : `${dados.historias} histórias`
                }
              />
              <Numero
                rotulo="Perdido em falhas"
                valor={
                  r.perda.fracao === null || AMOSTRA_PEQUENA(r.chamadas)
                    ? reais(r.perda.usd)
                    : pct(r.perda.fracao)
                }
                detalhe={`${reais(r.perda.usd)} · ${r.repetidas} repetidas`}
                alerta={(r.perda.fracao ?? 0) > ALERTA_PERDA_FALHAS}
              />
            </div>
            <p className={apoio}>
              Trocas de tamanho: {reais(r.trocasTamanhoUSD)} · Entrada servida
              pelo cache: {r.cache === null ? "—" : pct(r.cache)}
            </p>
          </section>

          <section aria-labelledby="t-semana" className="flex flex-col gap-3">
            <h2 id="t-semana" className={tituloSecao}>
              Gasto por semana
            </h2>
            <BarrasDeGasto semanas={dados.semanas} />
          </section>

          <section aria-labelledby="t-proj" className="flex flex-col gap-3">
            <h2 id="t-proj" className={tituloSecao}>
              Custo por livro, pelo hábito
            </h2>
            <p className={apoio}>
              {minutosLivro} min de áudio por livro, pelo custo medido. Meta:{" "}
              {formatarReais(META_CUSTO_LIVRO_BRL)}.
            </p>
            {dados.projecao === null ? (
              <p className={apoio}>Sem minutos de áudio medidos ainda.</p>
            ) : (
              <ul className="*:bg-papel flex flex-col gap-1 *:overflow-hidden *:rounded-xl">
                {dados.projecao.map((p) => {
                  const brl = emReais(p.livroUSD);
                  return (
                    <li
                      key={p.trocas}
                      className="font-ui flex items-center justify-between gap-4 px-4 py-3 text-[16px]"
                    >
                      <span className="text-tinta">
                        {p.trocas === 0
                          ? "Sem trocar o tamanho"
                          : `${String(p.trocas).replace(".", ",")} troca${p.trocas > 1 ? "s" : ""} por história`}
                      </span>
                      <span
                        className={`tabular-nums ${
                          brl > META_CUSTO_LIVRO_BRL
                            ? "text-aviso font-semibold"
                            : "text-tinta"
                        }`}
                      >
                        {formatarReais(brl)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {pequena ? (
              <p className={apoio}>
                Amostra pequena: parte do custo é fixa por história; com cerca
                de 10 histórias a projeção fica confiável.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="t-palavra" className="flex flex-col gap-3">
            <h2 id="t-palavra" className={tituloSecao}>
              Primeira palavra na tela
            </h2>
            <ul className="*:bg-papel flex flex-col gap-1 *:overflow-hidden *:rounded-xl">
              {dados.faixas.map((f) => (
                <li
                  key={f.faixa}
                  className="font-ui grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 text-[16px]"
                >
                  <span className="text-tinta">Áudio {f.rotulo}</span>
                  <span className="text-tinta text-right tabular-nums">
                    {segundos(f.p50_ms)}
                  </span>
                  <span className={apoio}>
                    {f.esperas === 0
                      ? "sem dados"
                      : AMOSTRA_PEQUENA(f.esperas)
                        ? `amostra pequena · ${f.esperas}`
                        : `${f.esperas} histórias`}
                  </span>
                  <span className={`${apoio} text-right tabular-nums`}>
                    95%: {segundos(f.p95_ms)}
                  </span>
                </li>
              ))}
            </ul>
            <p className={paradas ? "font-ui text-aviso text-[15px]" : apoio}>
              Fila parada (espera acima de {FILA_PARADA_MIN} min): {paradas}
            </p>
          </section>

          <section aria-labelledby="t-falhas" className="flex flex-col gap-3">
            <h2 id="t-falhas" className={tituloSecao}>
              Falhas por código
            </h2>
            {dados.falhas.length === 0 ? (
              <p className={apoio}>Nenhuma falha em {dados.dias} dias.</p>
            ) : (
              <ul className="*:bg-papel flex flex-col gap-1 *:overflow-hidden *:rounded-xl">
                {dados.falhas.map((f) => (
                  <li
                    key={`${f.etapa}:${f.codigo}`}
                    className="font-ui flex items-center justify-between gap-4 px-4 py-3 text-[16px]"
                  >
                    <span className="text-tinta min-w-0 break-words">
                      {f.codigo}{" "}
                      <span className="text-tinta-2">· {f.etapa}</span>
                    </span>
                    <span className="text-tinta tabular-nums">{f.vezes}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
