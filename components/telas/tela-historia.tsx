"use client";

// Ler a história (prompt 6, somente leitura): o texto da IA com os "Confira" grifados e o
// áudio original. Tocar num grifo mostra o motivo. Quem edita é o prompt 8.
import Link from "next/link";
import { Fragment, useState } from "react";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import type { Marcacao } from "@/lib/ai/schemas";
import type { HistoriaParaLer } from "@/lib/historias/tipos";
import type { LivroDaTela } from "@/lib/livro/tipos";

const TIPO: Record<string, string> = {
  fato: "Fato",
  nome: "Nome",
  data: "Data",
  lugar: "Lugar",
  numero: "Número",
  emocao: "Emoção",
  juizo: "Opinião",
  causa: "Causa",
  ordem: "Ordem",
  slop: "Expressão",
};

/** Divide o parágrafo em trechos normais e grifados, sem sobrepor grifos. */
function trechos(texto: string, marcas: Marcacao[]) {
  const ordenadas = [...marcas].sort((a, b) => a.inicio - b.inicio);
  const partes: { texto: string; marca: Marcacao | null }[] = [];
  let pos = 0;
  for (const m of ordenadas) {
    const inicio = Math.max(m.inicio, pos);
    const fim = Math.min(m.fim, texto.length);
    if (fim <= inicio) continue;
    if (inicio > pos)
      partes.push({ texto: texto.slice(pos, inicio), marca: null });
    partes.push({ texto: texto.slice(inicio, fim), marca: m });
    pos = fim;
  }
  if (pos < texto.length) partes.push({ texto: texto.slice(pos), marca: null });
  return partes;
}

export function TelaHistoria({
  livro,
  historia,
}: {
  livro: LivroDaTela;
  historia: HistoriaParaLer;
}) {
  const [aberta, setAberta] = useState<Marcacao | null>(null);
  const pronta = historia.estado === "pronta";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-16">
      <Link
        href={`/livro/${livro.id}/historias`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Histórias
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          {historia.titulo ?? (pronta ? "História sem título" : "Escrevendo…")}
        </h1>
        {historia.pergunta ? (
          <p className="text-ui-15 text-tinta-2">
            Responde: {historia.pergunta}
          </p>
        ) : null}
      </header>

      {historia.audios.map((a) =>
        a.url ? (
          <audio
            key={a.id}
            controls
            preload="none"
            src={a.url}
            aria-label="Ouvir o áudio original"
            className="w-full"
          />
        ) : null,
      )}

      {!pronta ? (
        <p className="text-ui-17 text-tinta-2">
          {historia.estado === "falhou"
            ? "Não deu certo. Já estamos vendo."
            : "A história ainda está sendo escrita. Volte em instantes."}
        </p>
      ) : (
        <>
          {historia.marcacoes.length ? (
            <DicaPrimeiraVez chave="confira">
              Grifado = confira com o áudio.
            </DicaPrimeiraVez>
          ) : null}
          <article className="font-livro text-livro-20 text-tinta flex flex-col gap-5 leading-relaxed">
            {historia.paragrafos.map((p, i) => (
              <p key={i}>
                {trechos(
                  p,
                  historia.marcacoes.filter((m) => m.paragrafo === i + 1),
                ).map((t, j) =>
                  t.marca ? (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setAberta(t.marca)}
                      className="bg-polen-2 decoration-floresta/60 inline rounded-sm box-decoration-clone text-left underline decoration-dotted underline-offset-4"
                    >
                      {t.texto}
                    </button>
                  ) : (
                    <Fragment key={j}>{t.texto}</Fragment>
                  ),
                )}
              </p>
            ))}
          </article>
          {historia.lacunas.length ? (
            <section className="rounded-cartao bg-papel border-linha flex flex-col gap-3 border p-5">
              <h2 className="text-ui-17 text-tinta font-medium">
                Para a próxima conversa
              </h2>
              <ul className="text-ui-17 text-tinta-2 flex list-disc flex-col gap-2 pl-5">
                {historia.lacunas.map((l, i) => (
                  <li key={i}>{l.pergunta}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <FolhaInferior
        aberta={aberta !== null}
        aoFechar={() => setAberta(null)}
        titulo="Confira"
      >
        {aberta ? (
          <div className="flex flex-col gap-3">
            <p className="text-ui-13 text-tinta-2 font-medium tracking-wide uppercase">
              {TIPO[aberta.tipo] ?? "Confira"}
            </p>
            <p className="font-livro text-livro-20 text-tinta">
              “{aberta.trecho}”
            </p>
            <p className="text-ui-17 text-tinta-2">{aberta.motivo}</p>
          </div>
        ) : null}
      </FolhaInferior>
    </main>
  );
}
