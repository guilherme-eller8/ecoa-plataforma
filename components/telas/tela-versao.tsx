"use client";

// Uma versão publicada do livro (prompt 13, design 5.6): preparando, pronta (prévia página a página
// e os dois PDFs) ou que não deu certo. Qualquer membro abre e baixa (Q7).
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import {
  CONSULTAR_PUBLICACAO_S,
  EXPORT_PREVIAS_POR_PEDIDO,
} from "@/lib/config";
import type { AcoesVersao, VersaoPublicada } from "@/lib/livro/montar-tipos";
import type { LivroDaTela } from "@/lib/livro/tipos";

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

function Moldura({
  livro,
  versao,
  children,
}: {
  livro: LivroDaTela;
  versao: number;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-7 px-5 pt-8 pb-12">
      <Link
        href={`/livro/${livro.id}/montar/conferir`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Voltar para conferir
      </Link>
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        Versão {versao} do livro
      </h1>
      {children}
    </main>
  );
}

function Prévia({ v, acoes }: { v: VersaoPublicada; acoes: AcoesVersao }) {
  const total = v.paginas ?? 0;
  // 0 = a capa; 1..total = as páginas do miolo.
  const [indice, setIndice] = useState(0);
  const [urls, setUrls] = useState<Record<number, string>>(() =>
    Object.fromEntries(v.previasUrls.map((u, i) => [i + 1, u])),
  );
  const pedidas = useRef(new Set<number>([1]));

  const garantir = useCallback(
    (pagina: number) => {
      if (pagina < 1 || pagina > total) return;
      const de =
        Math.floor((pagina - 1) / EXPORT_PREVIAS_POR_PEDIDO) *
          EXPORT_PREVIAS_POR_PEDIDO +
        1;
      if (pedidas.current.has(de)) return;
      pedidas.current.add(de);
      void acoes.previas(de).then((r) => {
        if (!r.ok) return pedidas.current.delete(de);
        setUrls((u) => ({
          ...u,
          ...Object.fromEntries(r.dados.urls.map((x, i) => [de + i, x])),
        }));
      });
    },
    [acoes, total],
  );

  useEffect(() => {
    garantir(indice);
    garantir(indice + 1);
  }, [indice, garantir]);

  const imagem = (n: number) => (n === 0 ? v.capaUrl : (urls[n] ?? null));
  const par = indice + 1 <= total ? indice + 1 : null;

  return (
    <section className="flex flex-col gap-4" aria-label="Prévia do livro">
      <div className="flex justify-center gap-3">
        {[indice, par].map((n, k) =>
          n === null ? null : (
            <div
              key={n}
              className={`bg-polen-2 rounded-interno flex aspect-[154/216] items-center justify-center overflow-hidden shadow-sm ${k === 1 ? "hidden w-1/2 md:flex" : "w-full max-w-sm md:w-1/2"} ${n === 0 ? "!aspect-[357/246] !max-w-none md:!w-full" : ""}`}
            >
              {imagem(n) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagem(n) as string}
                  alt={n === 0 ? "Capa aberta" : `Página ${n} de ${total}`}
                  className="size-full object-contain"
                />
              ) : (
                <span className="text-ui-15 text-tinta-2">Carregando…</span>
              )}
            </div>
          ),
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Botao
          variante="secundario"
          disabled={indice === 0}
          onClick={() => setIndice((i) => Math.max(0, i - 1))}
        >
          ← Anterior
        </Botao>
        <span
          className="text-ui-15 text-tinta-2 text-center"
          aria-live="polite"
        >
          {indice === 0 ? "Capa" : `Página ${indice} de ${total}`}
        </span>
        <Botao
          variante="secundario"
          disabled={indice >= total}
          onClick={() => setIndice((i) => Math.min(total, i + 1))}
        >
          Próxima →
        </Botao>
      </div>
    </section>
  );
}

export function TelaVersao({
  livro,
  versao: inicial,
  acoes,
}: {
  livro: LivroDaTela;
  versao: VersaoPublicada;
  acoes: AcoesVersao;
}) {
  const [v, setV] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<"miolo" | "capa" | null>(null);

  // Preparando: consulta a cada 3 s. Pronta com vozes ainda saindo: a cada 15 s.
  const incompleta = v.estado === "pronta" && v.vozesProntas < v.qrEsperados;
  useEffect(() => {
    if (v.estado !== "gerando" && !incompleta) return;
    const ms = (v.estado === "gerando" ? CONSULTAR_PUBLICACAO_S : 15) * 1000;
    const t = setInterval(() => {
      void acoes.estado().then((r) => r.ok && setV(r.dados));
    }, ms);
    return () => clearInterval(t);
  }, [v.estado, incompleta, acoes]);

  async function baixar(arquivo: "miolo" | "capa") {
    setBaixando(arquivo);
    setErro(null);
    const r = await acoes.baixar(arquivo);
    setBaixando(null);
    if (!r.ok) return setErro(r.mensagem);
    window.location.href = r.dados.url;
  }

  if (v.estado === "gerando") {
    return (
      <Moldura livro={livro} versao={v.versao}>
        <div
          className="rounded-cartao bg-papel flex flex-col gap-3 p-6"
          role="status"
        >
          <p className="font-livro text-livro-24 text-tinta">
            Preparando os PDFs.
          </p>
          <p className="text-ui-17 text-tinta-2">Leva cerca de 1 minuto.</p>
        </div>
      </Moldura>
    );
  }
  if (v.estado === "falhou") {
    return (
      <Moldura livro={livro} versao={v.versao}>
        <div
          className="rounded-cartao bg-erro-fundo text-erro flex flex-col gap-4 p-6"
          role="alert"
        >
          <p className="font-livro text-livro-24">Não deu certo desta vez.</p>
          <p className="text-ui-17">Publique de novo.</p>
          <Link
            href={`/livro/${livro.id}/montar/conferir`}
            className={classesDoBotao() + " self-start"}
          >
            Voltar para conferir
          </Link>
        </div>
      </Moldura>
    );
  }

  return (
    <Moldura livro={livro} versao={v.versao}>
      <p className="text-ui-17 text-tinta-2">
        {v.paginas} páginas · publicada em {DATA.format(new Date(v.criadoEm))}
      </p>
      <Prévia v={v} acoes={acoes} />
      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Botao
          carregando={baixando === "miolo"}
          onClick={() => baixar("miolo")}
        >
          Baixar miolo
        </Botao>
        <Botao
          variante="secundario"
          carregando={baixando === "capa"}
          onClick={() => baixar("capa")}
        >
          Baixar capa
        </Botao>
      </div>
      {v.qrEsperados > 0 ? (
        <p className="text-ui-15 text-tinta-2">
          Vozes prontas: {v.vozesProntas} de {v.qrEsperados}
        </p>
      ) : null}
    </Moldura>
  );
}
