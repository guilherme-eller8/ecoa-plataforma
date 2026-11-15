// Admin → Erros (prompt 15): jobs do Inngest que esgotaram as tentativas e erros do servidor
// por rota. Só ids, rota-padrão e contagens: nunca mensagem, URL ou token (T36).
import { EstadoVazio } from "@/components/ui/estado-vazio";
import type { ErroPorRota } from "@/lib/aderencia/erros";
import { ERROS_DIAS, INNGEST_RUN_URL } from "@/lib/config";
import { CabecalhoAdmin } from "./admin-cabecalho";

export type JobDaLista = {
  quando: string;
  funcao: string;
  runId: string;
  autor: string | null;
};

const apoio = "font-ui text-tinta-2 text-[15px]";

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));

export function TelaErros({
  jobs,
  rotas,
}: {
  jobs: JobDaLista[];
  rotas: ErroPorRota[];
}) {
  const titulo = "font-ui text-tinta text-[17px] font-semibold";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 pt-8 pb-16 md:px-10">
      <CabecalhoAdmin aba="erros" titulo="Erros" />

      {jobs.length === 0 && rotas.length === 0 ? (
        <EstadoVazio
          frase={`Nenhum erro nos últimos ${ERROS_DIAS} dias.`}
          acao={
            <p className={apoio}>
              Quando um job falhar ou uma página quebrar, aparece aqui.
            </p>
          }
        />
      ) : null}

      <section aria-labelledby="titulo-jobs" className="flex flex-col gap-3">
        <h2 id="titulo-jobs" className={titulo}>
          Jobs que falharam{" "}
          <span className="text-tinta-2 font-normal tabular-nums">
            {jobs.length}
          </span>
        </h2>
        {jobs.length === 0 ? (
          <p className={apoio}>Nenhum.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {jobs.map((j) => (
              <li
                key={`${j.runId}-${j.quando}`}
                className="bg-papel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="flex flex-col">
                  <span className="font-ui text-tinta text-[16px] break-all">
                    {j.funcao}
                  </span>
                  <span className={apoio}>
                    {quando(j.quando)}
                    {j.autor ? ` · ${j.autor}` : ""}
                  </span>
                </div>
                {j.runId ? (
                  <a
                    href={`${INNGEST_RUN_URL}/${encodeURIComponent(j.runId)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-ui text-floresta flex min-h-11 items-center text-[16px] underline underline-offset-4"
                  >
                    Abrir no Inngest
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-rotas" className="flex flex-col gap-3">
        <h2 id="titulo-rotas" className={titulo}>
          Erros do servidor por rota
        </h2>
        {rotas.length === 0 ? (
          <p className={apoio}>Nenhum.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rotas.map((r) => (
              <li
                key={r.rota}
                className="bg-papel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="flex flex-col">
                  <span className="font-ui text-tinta text-[16px] break-all">
                    {r.rota}
                  </span>
                  <span className={apoio}>
                    {r.tipo} · último {quando(r.ultimo)}
                  </span>
                </div>
                <span className={`${apoio} tabular-nums`}>
                  {r.ultimas24h} em 24 h · {r.ultimos7d} em 7 dias
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className={apoio}>
          Só a rota, o tipo e o código do Next. O texto do erro fica nos logs da
          Vercel.
        </p>
      </section>
    </main>
  );
}
