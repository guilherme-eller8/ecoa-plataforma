"use client";

// Proposta da IA mostrada como diferença (prompt 9, item 4): cada mudança no lugar, com o que
// entra em verde e o que sai riscado; "Não quero esta" por mudança; Aceitar tudo (ou "Aceitar
// 3 de 5") e Descartar. Parágrafo editado à mão aparece com cadeado. A prévia usa a mesma
// função que o servidor usa no aceite (comporProposta). Design: docs/designs/ia-sob-controle.md.
import { Fragment, useMemo, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { IconeCadeado } from "@/components/ui/icones";
import type { Paragrafo } from "@/lib/editor/conteudo";
import {
  diferencaPorPalavra,
  mudancasVencidas,
  type Mudanca,
} from "@/lib/editor/propostas";
import type { PropostaDaTela } from "@/lib/editor/tipos";
import { rotuloDaChave } from "@/lib/ui/tamanho";

export function tituloDaProposta(p: Pick<PropostaDaTela, "tipo" | "tamanho">) {
  if (p.tipo === "tamanho") return `Versão ${rotuloDaChave(p.tamanho)}`;
  if (p.tipo === "audio") return "Áudio novo";
  return "Trecho revisado";
}

type Bloco =
  | { tipo: "paragrafo"; p: Paragrafo }
  | { tipo: "mudanca"; m: Mudanca; antes: Paragrafo[] };

/** Ordem de leitura: o texto atual, com cada mudança no lugar do que ela troca. */
function blocos(atual: Paragrafo[], mudancas: Mudanca[]): Bloco[] {
  const porId = new Map(atual.map((p) => [p.id, p]));
  const primeiro = new Map<string, Mudanca>();
  const tiradas = new Set<string>();
  const posicao = new Map(atual.map((p, i) => [p.id, i]));
  for (const m of mudancas) {
    const presentes = m.tira
      .filter((t) => porId.has(t.id))
      .sort((a, b) => posicao.get(a.id)! - posicao.get(b.id)!);
    presentes.forEach((t) => tiradas.add(t.id));
    if (presentes.length) primeiro.set(presentes[0].id, m);
  }
  // Inserções depois da âncora (um parágrafo atual, ou um parágrafo posto por outra mudança).
  const dono = new Map<string, Mudanca>();
  for (const m of mudancas) for (const x of m.poe) dono.set(x.id, m);
  const depois = new Map<string, Mudanca[]>();
  const noComeco: Mudanca[] = [];
  const noFim: Mudanca[] = [];
  for (const m of mudancas) {
    if (m.tira.some((t) => porId.has(t.id))) continue;
    if (m.tira.length) {
      noFim.push(m); // tudo o que ela tira já sumiu do texto
      continue;
    }
    let ancora = m.depois_de;
    while (ancora && !porId.has(ancora) && dono.has(ancora)) {
      const d = dono.get(ancora)!;
      ancora = d.tira.find((t) => porId.has(t.id))?.id ?? d.depois_de;
    }
    if (!ancora) noComeco.push(m);
    else if (porId.has(ancora))
      depois.set(ancora, [...(depois.get(ancora) ?? []), m]);
    else noFim.push(m);
  }
  const r: Bloco[] = noComeco.map((m) => ({ tipo: "mudanca", m, antes: [] }));
  const emitir = (id: string) =>
    (depois.get(id) ?? []).forEach((m) =>
      r.push({ tipo: "mudanca", m, antes: [] }),
    );
  for (const p of atual) {
    const m = primeiro.get(p.id);
    if (m) {
      r.push({
        tipo: "mudanca",
        m,
        antes: m.tira.flatMap((t) =>
          porId.has(t.id) ? [porId.get(t.id)!] : [],
        ),
      });
      for (const t of m.tira) emitir(t.id);
    } else if (!tiradas.has(p.id)) {
      r.push({ tipo: "paragrafo", p });
      emitir(p.id);
    }
  }
  for (const m of noFim) r.push({ tipo: "mudanca", m, antes: [] });
  return r;
}

export function Diferenca({
  atual,
  proposta,
  ocupado,
  aoAceitar,
  aoDescartar,
}: {
  atual: Paragrafo[];
  proposta: PropostaDaTela;
  ocupado: boolean;
  aoAceitar: (aceitas: string[]) => void;
  aoDescartar: () => void;
}) {
  const [recusadas, setRecusadas] = useState<Set<string>>(new Set());
  const vencidas = useMemo(
    () => mudancasVencidas(atual, proposta),
    [atual, proposta],
  );
  const lista = useMemo(
    () => blocos(atual, proposta.mudancas),
    [atual, proposta],
  );
  const validas = proposta.mudancas.filter((m) => !vencidas.has(m.id));
  const aceitas = validas.filter((m) => !recusadas.has(m.id)).map((m) => m.id);
  const nenhuma = proposta.mudancas.length === 0;

  const alternar = (id: string) =>
    setRecusadas((r) => {
      const n = new Set(r);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <section aria-label="Proposta da IA" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-ui-13 text-tinta-2 font-medium tracking-wide uppercase">
          Proposta da IA
        </h2>
        <p className="font-livro text-livro-24 text-tinta leading-tight">
          {tituloDaProposta(proposta)}
        </p>
        {!nenhuma ? (
          <p className="text-ui-15 text-tinta-2">
            <span className="bg-floresta-claro text-floresta rounded-sm px-1">
              Verde
            </span>{" "}
            entra; <span className="line-through">riscado</span> sai.
          </p>
        ) : null}
      </div>

      {nenhuma ? (
        <p className="text-ui-17 text-tinta-2">
          A IA não achou nada para mudar.
        </p>
      ) : (
        <div className="font-livro text-livro-20 text-tinta flex flex-col gap-5 leading-relaxed">
          {lista.map((b, i) =>
            b.tipo === "paragrafo" ? (
              <div
                key={b.p.id}
                className={b.p.editado ? "flex flex-col gap-1" : undefined}
              >
                {b.p.editado ? (
                  <span className="text-ui-13 text-tinta-2 inline-flex items-center gap-1.5">
                    <IconeCadeado tamanho={14} />
                    Editado à mão · fica como está
                  </span>
                ) : null}
                <p className="text-tinta/80">{b.p.texto}</p>
              </div>
            ) : (
              <BlocoDeMudanca
                key={`${b.m.id}-${i}`}
                antes={b.antes}
                m={b.m}
                vencida={vencidas.has(b.m.id)}
                recusada={recusadas.has(b.m.id)}
                aoAlternar={() => alternar(b.m.id)}
                ocupado={ocupado}
              />
            ),
          )}
        </div>
      )}

      <div className="bg-polen sticky bottom-0 z-10 -mx-5 flex flex-col gap-2 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center lg:static lg:mx-0 lg:bg-transparent lg:px-0">
        {nenhuma ? (
          <Botao carregando={ocupado} onClick={aoDescartar}>
            Fechar
          </Botao>
        ) : (
          <>
            <Botao
              carregando={ocupado}
              disabled={!aceitas.length}
              onClick={() => aoAceitar(aceitas)}
            >
              {aceitas.length === proposta.mudancas.length
                ? "Aceitar tudo"
                : aceitas.length
                  ? `Aceitar ${aceitas.length} de ${proposta.mudancas.length}`
                  : "Nenhuma escolhida"}
            </Botao>
            <Botao variante="texto" disabled={ocupado} onClick={aoDescartar}>
              Descartar
            </Botao>
          </>
        )}
      </div>
    </section>
  );
}

function BlocoDeMudanca({
  antes,
  m,
  vencida,
  recusada,
  aoAlternar,
  ocupado,
}: {
  antes: Paragrafo[];
  m: Mudanca;
  vencida: boolean;
  recusada: boolean;
  aoAlternar: () => void;
  ocupado: boolean;
}) {
  const textoAntes = antes.map((p) => p.texto).join("\n\n");
  const textoDepois = m.poe.map((p) => p.texto).join("\n\n");
  const pedacos = useMemo(
    () => diferencaPorPalavra(textoAntes, textoDepois),
    [textoAntes, textoDepois],
  );
  const fora = vencida || recusada;
  return (
    <div
      className={
        "rounded-interno flex flex-col gap-2 border-l-4 py-1 pl-4 " +
        (fora ? "border-linha" : "border-floresta")
      }
    >
      {fora ? (
        <p className="whitespace-pre-line">{textoAntes || " "}</p>
      ) : (
        <p className="whitespace-pre-line">
          {pedacos.map((x, i) => (
            <Fragment key={i}>
              {x.tipo === "igual" ? (
                x.texto
              ) : x.tipo === "inserido" ? (
                <ins className="bg-floresta-claro text-floresta rounded-sm no-underline">
                  {x.texto}
                </ins>
              ) : (
                <del className="text-tinta-2 decoration-tinta-2/70">
                  {x.texto}
                </del>
              )}
            </Fragment>
          ))}
        </p>
      )}
      {vencida ? (
        <p className="font-ui text-ui-15 text-aviso">
          O texto mudou aqui. Fica como está.
        </p>
      ) : (
        <button
          type="button"
          disabled={ocupado}
          onClick={aoAlternar}
          aria-pressed={recusada}
          className="font-ui text-ui-15 text-floresta inline-flex min-h-11 items-center self-start font-medium underline-offset-4 hover:underline disabled:opacity-50"
        >
          {recusada ? "Quero esta" : "Não quero esta"}
        </button>
      )}
    </div>
  );
}
