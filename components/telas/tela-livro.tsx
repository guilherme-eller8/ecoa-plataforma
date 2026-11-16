// Home do livro (P72): o cartão "Agora" diz a próxima ação; ao lado, o livro em páginas.
// Abaixo, as histórias mais recentes e o que chegou da família. No computador, 12 colunas
// (8 + 4); no celular, uma coluna com o "Agora" logo depois do título.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { AtualizarAoVivo } from "@/components/ui/atualizar-ao-vivo";
import { HistoriasAoVivo } from "@/components/ui/historias-ao-vivo";
import { MarcoPrimeiraHistoria } from "@/components/ui/marco-primeira-historia";
import { CabecalhoLivro } from "@/components/livro/cabecalho-livro";
import { CartaoAgora } from "@/components/livro/cartao-agora";
import type { AoVivo } from "@/components/ui/historias-ao-vivo";
import { PAGINAS_INCLUSAS } from "@/lib/config";
import type { GuardadaDaTela, HistoriaDaTela } from "@/lib/historias/tipos";
import {
  contarHistorias,
  oQueFazerAgora,
  type ResumoDasHistorias,
} from "@/lib/livro/agora";
import { pendentes, type Passo } from "@/lib/livro/configuracao";
import type {
  AcoesArquivar,
  AcoesPerguntas,
  LivroDaTela,
  PerguntaDaTela,
} from "@/lib/livro/tipos";

const NOME_DO_PASSO: Record<Passo, string> = {
  quem: "Quem é",
  perguntas: "Primeiras perguntas",
  fotos: "Fotos",
  ajuda: "Quem mais ajuda",
};

const DIA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

function nomeDaGravacao(g: GuardadaDaTela) {
  const tipo = g.origem === "conversa" ? "Conversa" : "Gravação";
  const minutos = g.duracaoS
    ? ` · ${Math.max(1, Math.round(g.duracaoS / 60))} min`
    : "";
  return g.recebidaEm
    ? `${tipo} de ${DIA.format(new Date(g.recebidaEm))}${minutos}`
    : `${tipo}${minutos}`;
}

const linkTexto =
  "text-ui-17 text-floresta min-h-alvo inline-flex items-center font-medium underline-offset-4 hover:underline";

export type ResumoDoLivro = {
  paraPerguntar: number;
  causosNovos: number;
  enqueteAberta: boolean;
  audios: number;
  mensagens?: { total: number; noLivro: number }; // prompt 12
  historias?: ResumoDasHistorias; // P72: todas as histórias, não só as recentes
};

export function TelaLivro({
  livro,
  resumo,
  historias = [],
  perguntas = [],
  linkAutor = null,
  linkFamilia = null,
  marcarVista,
  mudarEstado,
  vitrine,
  guardadas = [],
  arquivarHistoria,
  ehAdmin = false,
}: {
  livro: LivroDaTela;
  resumo: ResumoDoLivro;
  historias?: HistoriaDaTela[];
  perguntas?: PerguntaDaTela[]; // na ordem da lista: a 1ª para enviar vai para o "Agora"
  linkAutor?: string | null;
  linkFamilia?: string | null;
  marcarVista?: (historia: string) => Promise<void>;
  mudarEstado?: AcoesPerguntas["mudarEstado"]; // "Enviar ao autor" marca a pergunta como enviada
  vitrine?: Record<string, AoVivo>; // só na vitrine: sem canal, com texto de exemplo
  guardadas?: GuardadaDaTela[]; // gravações que chegaram e ainda não viraram história
  arquivarHistoria?: AcoesArquivar; // P71
  ehAdmin?: boolean; // Evals 1A: atalho de volta ao admin, só para quem é admin
}) {
  const falta = livro.podeEscrever
    ? pendentes(
        livro.configuracao,
        livro.ehResponsavel ? "responsavel" : "cofacilitador",
      )
    : [];
  const base = `/livro/${livro.id}`;
  const recentes = historias.slice(0, 4);
  const listaAoVivo = Boolean(recentes.length && marcarVista);
  const agora = oQueFazerAgora({
    podeEscrever: livro.podeEscrever,
    iaConfirmada: livro.iaConfirmada,
    audios: resumo.audios,
    falta,
    perguntas,
  });
  const contagem = resumo.historias ?? {
    paginas: 0,
    ...contarHistorias(
      historias.map((h) => ({ estado: h.estado, revisada: h.revisada })),
    ),
  };
  const prontasOuRevisar = contagem.prontas + contagem.paraRevisar;
  const escrevendo = historias.find(
    (h) => h.estado === "escrevendo" || h.estado === "ouvindo",
  );
  // O "Agora" já cuida das primeiras perguntas; o cartão de configuração mostra o resto.
  const outrosPassos = falta.filter(
    (p) => !(agora?.tipo === "primeiras_perguntas" && p === "perguntas"),
  );
  const paginas = contagem.paginas;
  const alem = paginas - PAGINAS_INCLUSAS;
  const porcentagem = Math.min(100, (paginas / PAGINAS_INCLUSAS) * 100);

  return (
    <>
      <CabecalhoLivro livroId={livro.id} secao="inicio" ehAdmin={ehAdmin} />
      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-5 pt-6 pb-16 md:pt-10 lg:grid-cols-12 lg:gap-x-6 lg:px-10">
        {/* Gravação guardada vira "ouvindo" e "escrevendo" na tela, em todos os aparelhos. Com
            história na lista, é ela que assina o canal; senão, a home assina (primeira gravação). */}
        {vitrine ? null : (
          <AtualizarAoVivo
            livroId={livro.id}
            canal={!listaAoVivo}
            ativo={guardadas.some((g) => g.andando)}
          />
        )}

        <div className="flex items-center gap-4 pb-2 lg:col-span-12 lg:pb-4">
          {livro.fotoAutorUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage
            <img
              src={livro.fotoAutorUrl}
              alt=""
              className="size-16 shrink-0 rounded-full object-cover md:size-20"
            />
          ) : null}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-livro text-livro-36 text-tinta md:text-livro-44 leading-[1.05]">
              O livro do {livro.autor}
            </h1>
            {!livro.podeEscrever ? (
              <p className="text-ui-15 text-tinta-2">Somente leitura</p>
            ) : escrevendo ? (
              <p className="text-ui-17 text-tinta-2 flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="animate-pulsar bg-floresta mt-[0.6em] size-2 shrink-0 rounded-full"
                />
                {escrevendo.titulo
                  ? `“${escrevendo.titulo}” está sendo escrita agora.`
                  : "Uma história está sendo escrita agora."}
              </p>
            ) : null}
          </div>
        </div>

        {agora ? (
          <div className="lg:col-span-8">
            <CartaoAgora
              agora={agora}
              livro={livro}
              linkAutor={linkAutor}
              paraEnviar={resumo.paraPerguntar}
              mudarEstado={mudarEstado}
            />
          </div>
        ) : null}

        <section
          aria-labelledby="o-livro"
          className={
            "rounded-cartao bg-papel flex flex-col gap-5 p-6 md:p-8 " +
            (agora ? "lg:col-span-4" : "lg:col-span-12")
          }
        >
          <h2 id="o-livro" className="text-ui-15 text-tinta-2 font-medium">
            O livro
          </h2>
          <div className="flex flex-col gap-3">
            <p className="font-livro text-livro-36 text-tinta">
              <span className="num">{paginas}</span>
              <span className="text-livro-20 text-tinta-2">
                {alem > 0
                  ? " páginas"
                  : ` de ${PAGINAS_INCLUSAS} ${paginas === 1 ? "página" : "páginas"}`}
              </span>
            </p>
            <div
              role="progressbar"
              aria-label="Páginas escritas"
              aria-valuemin={0}
              aria-valuemax={PAGINAS_INCLUSAS}
              aria-valuenow={Math.min(paginas, PAGINAS_INCLUSAS)}
              aria-valuetext={`Cerca de ${paginas} de ${PAGINAS_INCLUSAS} páginas`}
              className="rounded-controle bg-polen-2 h-2 overflow-hidden"
            >
              <div
                className="rounded-controle bg-floresta h-full"
                style={{ width: `${porcentagem}%` }}
              />
            </div>
            {alem > 0 ? (
              <p className="text-ui-15 text-tinta-2">
                {alem} além das {PAGINAS_INCLUSAS} do plano
              </p>
            ) : null}
          </div>
          <dl className="text-ui-17 flex flex-col">
            {(
              [
                ["Prontas", contagem.prontas],
                ["Para revisar", contagem.paraRevisar],
                ["Sendo feitas", contagem.andando],
              ] as const
            ).map(([rotulo, valor]) => (
              <div
                key={rotulo}
                className="flex items-center justify-between py-2"
              >
                <dt className="text-tinta-2">{rotulo}</dt>
                <dd className="num text-tinta">{valor}</dd>
              </div>
            ))}
          </dl>
          {prontasOuRevisar >= 1 ? (
            <Link
              href={`${base}/montar`}
              className={classesDoBotao({ variante: "secundario" })}
            >
              <span>Montar o livro</span>
            </Link>
          ) : null}
        </section>

        {prontasOuRevisar === 1 ? (
          <div className="lg:col-span-8">
            <MarcoPrimeiraHistoria
              livroId={livro.id}
              autor={livro.autor}
              linkFamilia={linkFamilia}
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-10 pt-6 lg:col-span-8 lg:col-start-1">
          {listaAoVivo && marcarVista ? (
            <section
              aria-labelledby="historias"
              className="flex flex-col gap-4"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2
                  id="historias"
                  className="font-livro text-livro-28 text-tinta"
                >
                  Histórias
                </h2>
                <Link href={`${base}/historias`} className={linkTexto}>
                  Ver todas
                </Link>
              </div>
              <HistoriasAoVivo
                livroId={livro.id}
                historias={recentes}
                arquivar={livro.podeEscrever ? arquivarHistoria : undefined}
                marcarVista={marcarVista}
                canal={!vitrine}
                inicial={vitrine}
              />
            </section>
          ) : null}

          {guardadas.length ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-ui-20 text-tinta font-medium">
                Gravações guardadas
              </h2>
              <ul className="flex flex-col gap-2">
                {guardadas.map((g) => (
                  <li
                    key={g.id}
                    className="bg-papel flex flex-col gap-1 rounded-2xl px-4 py-3"
                  >
                    <p className="text-ui-17 text-tinta">
                      {g.titulo ?? nomeDaGravacao(g)}
                    </p>
                    <p className="text-ui-15 text-tinta-2">
                      {g.frase}{" "}
                      {g.confirmar ? (
                        <Link
                          href={`${base}/configuracoes#ia`}
                          className="text-floresta font-medium underline-offset-4 hover:underline"
                        >
                          Confirmar
                        </Link>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 pt-6 lg:col-span-4">
          <section
            aria-labelledby="familia"
            className="rounded-cartao bg-papel flex flex-col gap-1 p-6"
          >
            <h2
              id="familia"
              className="font-livro text-livro-24 text-tinta pb-2"
            >
              Da família
            </h2>
            {resumo.causosNovos || resumo.enqueteAberta ? (
              <Link
                href={`${base}/perguntas?aba=${resumo.causosNovos ? "causos" : "enquete"}`}
                className={linkTexto}
              >
                {[
                  resumo.causosNovos
                    ? `${resumo.causosNovos} ${resumo.causosNovos === 1 ? "causo novo" : "causos novos"}`
                    : null,
                  resumo.enqueteAberta ? "enquete aberta" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Link>
            ) : null}
            {resumo.audios ? (
              <Link href={`${base}/audios`} className={linkTexto}>
                {resumo.audios === 1
                  ? "1 áudio recebido"
                  : `${resumo.audios} áudios recebidos`}
              </Link>
            ) : null}
            <Link href={`${base}/mensagens`} className={linkTexto}>
              {resumo.mensagens?.total
                ? `Mensagens da família · ${resumo.mensagens.total}`
                : "Mensagens da família"}
            </Link>
            <Link href={`${base}/kit`} className={linkTexto}>
              Convidar a família
            </Link>
          </section>

          {outrosPassos.length ? (
            <section className="rounded-cartao bg-papel border-linha flex flex-col gap-4 border p-6">
              <h2 className="text-ui-20 text-tinta font-medium">
                Continuar a configuração
              </h2>
              <p className="text-ui-15 text-tinta-2">
                Falta: {outrosPassos.map((p) => NOME_DO_PASSO[p]).join(", ")}.
              </p>
              <Link
                href={`${base}/configurar/${outrosPassos[0]}`}
                className={
                  classesDoBotao({ variante: "secundario" }) + " self-start"
                }
              >
                <span>Continuar</span>
              </Link>
            </section>
          ) : null}
        </aside>
      </main>
    </>
  );
}
