// Cartão de história com as etapas ao vivo (PRD, M5):
// Enviando → Ouvindo → Escrevendo → Pronta para revisar. Depois: Pronta. Ou: Não deu certo.
// Só apresentação: recebe o estado pronto, não busca nada.
import type { ReactNode } from "react";
import {
  ETAPAS,
  etapaConcluida,
  indiceDaEtapa,
  rotuloDaEtapa,
  type Etapa,
} from "@/lib/ui/etapas";
import { falarDuracao } from "@/lib/ui/tempo";
import { IconeCheck } from "./icones";

export type EstadoCartao = Etapa | "pronta" | "falhou";

type Props = {
  titulo: string | null; // null enquanto a IA não deu o título
  estado: EstadoCartao;
  origem: string;
  duracaoSeg: number | null;
  trecho?: string;
  paginas?: number;
  selo?: string; // ex.: "Corrigida pelo Jair"
  acao?: ReactNode;
  destaque?: boolean; // o cartão que está acontecendo agora
};

function Etapas({ atual }: { atual: Etapa }) {
  const i = indiceDaEtapa(atual);
  const vivo = atual !== "revisar";
  return (
    <div className="flex flex-col gap-2">
      <ol aria-label="Etapas" className="flex gap-1.5">
        {ETAPAS.map((e) => {
          const feita = etapaConcluida(e.id, atual);
          const agora = e.id === atual;
          return (
            <li
              key={e.id}
              aria-current={agora ? "step" : undefined}
              className={
                "rounded-controle h-1.5 flex-1 " +
                (feita || (agora && !vivo)
                  ? "bg-floresta"
                  : agora
                    ? "bg-floresta/45"
                    : "bg-polen-2")
              }
            >
              <span className="sr-only">
                {e.rotulo}
                {feita ? ", feito" : agora ? ", agora" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <p
        className="text-ui-15 text-floresta flex items-center gap-2 font-medium"
        aria-live="polite"
      >
        {vivo ? (
          <span
            aria-hidden="true"
            className="animate-pulsar bg-floresta size-2 rounded-full"
          />
        ) : (
          <IconeCheck tamanho={18} />
        )}
        {rotuloDaEtapa(atual)}
        <span className="sr-only">
          , etapa {i + 1} de {ETAPAS.length}
        </span>
      </p>
    </div>
  );
}

export function CartaoHistoria({
  titulo,
  estado,
  origem,
  duracaoSeg,
  trecho,
  paginas,
  selo,
  acao,
  destaque = false,
}: Props) {
  const processando =
    estado === "enviando" || estado === "ouvindo" || estado === "escrevendo";
  const nome =
    titulo?.trim() || (processando ? "Nova história" : "História sem título");
  return (
    <article
      className={
        "rounded-cartao flex flex-col gap-4 p-5 md:p-6 " +
        (destaque
          ? "border-floresta/30 bg-papel border"
          : "bg-papel border border-transparent")
      }
    >
      <header className="flex flex-col gap-1">
        <h3 className="font-livro text-livro-24 text-tinta">{nome}</h3>
        <p className="text-ui-15 text-tinta-2">
          {origem}
          {duracaoSeg ? (
            <>
              {" "}
              · <span className="num">{falarDuracao(duracaoSeg)}</span> de áudio
            </>
          ) : null}
          {estado === "pronta" && paginas ? (
            <>
              {" "}
              · <span className="num">{paginas}</span> páginas
            </>
          ) : null}
        </p>
      </header>

      {estado === "pronta" ? null : estado === "falhou" ? (
        <p className="text-ui-15 text-tinta-2" aria-live="polite">
          Não deu certo. Já estamos vendo.
        </p>
      ) : (
        <Etapas atual={estado} />
      )}

      {estado === "escrevendo" && trecho ? (
        <p className="font-livro text-livro-20 text-tinta whitespace-pre-line">
          {trecho}
          <span
            aria-hidden="true"
            className="animate-cursor bg-floresta ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.2em]"
          />
        </p>
      ) : !processando && trecho ? (
        <p className="font-livro text-livro-20 text-tinta line-clamp-2">
          {trecho}
        </p>
      ) : null}

      {selo || acao || estado === "pronta" ? (
        <footer className="flex flex-wrap items-center justify-between gap-3">
          {estado === "pronta" ? (
            <span className="text-ui-15 text-tinta-2 inline-flex items-center gap-1.5">
              <IconeCheck tamanho={18} />
              Pronta para o livro
            </span>
          ) : selo ? (
            <span className="rounded-chip bg-floresta-claro text-ui-13 text-floresta px-2.5 py-1 font-medium">
              {selo}
            </span>
          ) : (
            <span />
          )}
          {acao}
        </footer>
      ) : null}
    </article>
  );
}
