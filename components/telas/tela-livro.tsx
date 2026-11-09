// Home do livro: uma ação principal (Nova história, P26), Perguntas como secundária, os
// áudios recebidos, o cartão de configuração pendente e o convite da família.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { IconePerguntas, IconeSubir } from "@/components/ui/icones";
import { Marca } from "@/components/ui/marca";
import { pendentes, type Passo } from "@/lib/livro/configuracao";
import type { LivroDaTela } from "@/lib/livro/tipos";

const NOME_DO_PASSO: Record<Passo, string> = {
  quem: "Quem é",
  perguntas: "Primeiras perguntas",
  fotos: "Fotos",
};

export type ResumoDoLivro = {
  paraPerguntar: number;
  causosNovos: number;
  enqueteAberta: boolean;
  audios: number;
};

export function TelaLivro({
  livro,
  resumo,
}: {
  livro: LivroDaTela;
  resumo: ResumoDoLivro;
}) {
  const falta = livro.podeEscrever ? pendentes(livro.configuracao) : [];
  const base = `/livro/${livro.id}`;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-10 px-5 pt-8 pb-12">
      <div className="flex items-center justify-between gap-4">
        <Marca />
        {!livro.podeEscrever ? (
          <span className="text-ui-15 bg-papel text-tinta-2 rounded-full px-4 py-2">
            Somente leitura
          </span>
        ) : null}
      </div>

      <section className="flex flex-col gap-6">
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
        <div className="flex flex-col gap-3 sm:flex-row">
          {livro.podeEscrever ? (
            <Link
              href={`${base}/historias/nova`}
              className={classesDoBotao({ larguraTotal: true }) + " sm:w-auto"}
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
              }) + " sm:w-auto"
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
      </section>

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

      <Link
        href={`${base}/kit`}
        className="text-ui-17 text-floresta min-h-alvo inline-flex items-center self-start font-medium underline-offset-4 hover:underline"
      >
        Convidar a família
      </Link>
    </main>
  );
}
