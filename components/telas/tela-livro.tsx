// Home do livro: uma ação principal (Nova história, P26), Perguntas como secundária, os
// áudios recebidos, o cartão de configuração pendente e o convite da família.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { IconePerguntas, IconeSubir } from "@/components/ui/icones";
import { AtualizarAoVivo } from "@/components/ui/atualizar-ao-vivo";
import { HistoriasAoVivo } from "@/components/ui/historias-ao-vivo";
import { Marca } from "@/components/ui/marca";
import { MarcoPrimeiraHistoria } from "@/components/ui/marco-primeira-historia";
import type { AoVivo } from "@/components/ui/historias-ao-vivo";
import type { GuardadaDaTela, HistoriaDaTela } from "@/lib/historias/tipos";
import { pendentes, type Passo } from "@/lib/livro/configuracao";
import type { AcoesArquivar, LivroDaTela } from "@/lib/livro/tipos";

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

export type ResumoDoLivro = {
  paraPerguntar: number;
  causosNovos: number;
  enqueteAberta: boolean;
  audios: number;
  mensagens?: { total: number; noLivro: number }; // prompt 12
};

export function TelaLivro({
  livro,
  resumo,
  historias = [],
  linkFamilia = null,
  marcarVista,
  vitrine,
  guardadas = [],
  arquivarHistoria,
}: {
  livro: LivroDaTela;
  resumo: ResumoDoLivro;
  historias?: HistoriaDaTela[];
  linkFamilia?: string | null;
  marcarVista?: (historia: string) => Promise<void>;
  vitrine?: Record<string, AoVivo>; // só na vitrine: sem canal, com texto de exemplo
  guardadas?: GuardadaDaTela[]; // gravações que chegaram e ainda não viraram história
  arquivarHistoria?: AcoesArquivar; // P71
}) {
  const falta = livro.podeEscrever
    ? pendentes(
        livro.configuracao,
        livro.ehResponsavel ? "responsavel" : "cofacilitador",
      )
    : [];
  const base = `/livro/${livro.id}`;
  const prontas = historias.filter((h) => h.estado === "pronta").length;
  const recentes = historias.slice(0, 3);
  const pedirConfirmacao =
    livro.podeEscrever && !livro.iaConfirmada && resumo.audios > 0;
  const listaAoVivo = Boolean(recentes.length && marcarVista);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-10 px-5 pt-8 pb-12 md:max-w-2xl lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-x-16 lg:px-10">
      {/* Gravação guardada vira "ouvindo" e "escrevendo" na tela, em todos os aparelhos. Com
          história na lista, é ela que assina o canal; senão, a home assina (primeira gravação). */}
      {vitrine ? null : (
        <AtualizarAoVivo
          livroId={livro.id}
          canal={!listaAoVivo}
          ativo={guardadas.some((g) => g.andando)}
        />
      )}
      <div className="flex items-center justify-between gap-4 lg:col-span-2">
        <Marca />
        {!livro.podeEscrever ? (
          <span className="text-ui-15 bg-papel text-tinta-2 rounded-full px-4 py-2">
            Somente leitura
          </span>
        ) : null}
      </div>

      <section className="flex flex-col gap-6 lg:col-start-1 lg:row-start-2">
        {livro.fotoAutorUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage
          <img
            src={livro.fotoAutorUrl}
            alt=""
            className="size-24 rounded-full object-cover"
          />
        ) : null}
        <h1 className="font-livro text-livro-44 text-tinta leading-[1.05]">
          O livro do {livro.autor}
        </h1>
        <p className="text-ui-17 text-tinta-2">
          {resumo.paraPerguntar === 1
            ? "1 pergunta para fazer"
            : `${resumo.paraPerguntar} perguntas para fazer`}
          {resumo.causosNovos
            ? ` · ${resumo.causosNovos} ${resumo.causosNovos === 1 ? "causo novo" : "causos novos"}`
            : ""}
          {resumo.enqueteAberta ? " · enquete aberta" : ""}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-wrap">
          {livro.podeEscrever ? (
            <Link
              href={`${base}/historias/nova`}
              className={
                classesDoBotao({ larguraTotal: true }) +
                " whitespace-nowrap sm:w-auto"
              }
            >
              <IconeSubir tamanho={20} />
              <span>Nova história</span>
            </Link>
          ) : null}
          <Link
            href={`${base}/perguntas`}
            className={
              classesDoBotao({
                variante: livro.podeEscrever ? "secundario" : "principal",
                larguraTotal: true,
              }) + " whitespace-nowrap sm:w-auto"
            }
          >
            <IconePerguntas tamanho={20} />
            <span>Perguntas</span>
          </Link>
        </div>
        {resumo.audios ? (
          <Link
            href={`${base}/audios`}
            className="text-ui-17 text-floresta min-h-alvo inline-flex items-center self-start font-medium underline-offset-4 hover:underline"
          >
            {resumo.audios === 1
              ? "1 áudio recebido"
              : `${resumo.audios} áudios recebidos`}
          </Link>
        ) : null}
        <Link
          href={`${base}/mensagens`}
          className="text-ui-17 text-floresta min-h-alvo inline-flex items-center self-start font-medium underline-offset-4 hover:underline"
        >
          {resumo.mensagens?.total
            ? `Mensagens da família · ${resumo.mensagens.total} · ${resumo.mensagens.noLivro} no livro`
            : "Mensagens da família"}
        </Link>
      </section>

      <div className="flex min-w-0 flex-col gap-10 lg:col-start-2 lg:row-span-3 lg:row-start-2">
        {prontas === 1 ? (
          <MarcoPrimeiraHistoria
            livroId={livro.id}
            autor={livro.autor}
            linkFamilia={linkFamilia}
          />
        ) : null}

        {pedirConfirmacao ? (
          <section className="rounded-cartao bg-papel border-floresta/30 flex flex-col gap-4 border p-5">
            <p className="text-ui-17 text-tinta">
              Os áudios esperam uma confirmação sua para virar texto.
            </p>
            <Link
              href={`${base}/configuracoes#ia`}
              className={
                classesDoBotao({ variante: "secundario" }) + " self-start"
              }
            >
              <span>Confirmar</span>
            </Link>
          </section>
        ) : null}

        {listaAoVivo && marcarVista ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-ui-20 text-tinta font-medium">Histórias</h2>
              <Link
                href={`${base}/historias`}
                className="text-ui-17 text-floresta min-h-alvo inline-flex items-center font-medium underline-offset-4 hover:underline"
              >
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

        {falta.length ? (
          <section className="rounded-cartao bg-papel border-linha flex flex-col gap-4 border p-5">
            <h2 className="text-ui-20 text-tinta font-medium">
              Continuar a configuração
            </h2>
            <p className="text-ui-15 text-tinta-2">
              Falta: {falta.map((p) => NOME_DO_PASSO[p]).join(", ")}.
            </p>
            <Link
              href={`${base}/configurar/${falta[0]}`}
              className={
                classesDoBotao({ variante: "secundario" }) + " self-start"
              }
            >
              <span>Continuar</span>
            </Link>
          </section>
        ) : null}
      </div>

      {prontas >= 1 ? (
        <Link
          href={`${base}/montar`}
          className="rounded-cartao bg-papel hover:bg-polen-2 flex min-h-20 flex-col justify-center gap-1 px-5 py-4 lg:col-start-1 lg:row-start-3 lg:w-full"
        >
          <span className="text-ui-20 text-tinta font-medium">
            Montar o livro
          </span>
          <span className="text-ui-15 text-tinta-2">
            Ordem, capa e os PDFs para a gráfica
          </span>
        </Link>
      ) : null}

      <nav className="flex flex-wrap gap-x-6 lg:col-start-1 lg:row-start-4">
        <Link
          href={`${base}/kit`}
          className="text-ui-17 text-floresta min-h-alvo inline-flex items-center font-medium underline-offset-4 hover:underline"
        >
          Convidar a família
        </Link>
        <Link
          href={`${base}/configuracoes`}
          className="text-ui-17 text-floresta min-h-alvo inline-flex items-center font-medium underline-offset-4 hover:underline"
        >
          Configurações
        </Link>
      </nav>
    </main>
  );
}
