// Home do livro: uma ação principal (Perguntas), o cartão de configuração pendente e o
// convite da família. Substitui a tela vazia do prompt 3.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { IconePerguntas } from "@/components/ui/icones";
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
        <Link
          href={`${base}/perguntas`}
          className={
            classesDoBotao({ larguraTotal: true }) + " sm:w-auto sm:self-start"
          }
        >
          <IconePerguntas tamanho={20} />
          <span>Perguntas</span>
        </Link>
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
