"use client";

// Nova enquete (P35). Primeiro o responsável decide: a família vê todas as perguntas, ou ele
// escolhe antes, fase por fase. Nos dois casos passa pela revisão, agrupada por fase, antes
// de abrir. Cada pessoa da família marca até 2 por fase.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import {
  MAX_ITENS_ENQUETE,
  TEXTO_PERGUNTA_MAX,
  VOTOS_POR_FASE,
} from "@/lib/config";
import { CATEGORIAS, OUTRAS, type Categoria } from "@/lib/enquete/fases";
import type {
  CandidatoDaEnquete,
  CausoDaTela,
  LivroDaTela,
  Resposta,
} from "@/lib/livro/tipos";
import { PERGUNTAS, perguntasDoTema } from "@/lib/perguntas/banco";
import { textoSugerido } from "@/lib/perguntas/sugestao";

export type VistaNovaEnquete = "como" | "revisar" | number; // número = índice da etapa

type Props = {
  livro: LivroDaTela;
  causos: CausoDaTela[]; // sugestões da família ainda livres (novo ou na enquete)
  causoInicial?: string | null;
  abrirEnquete: (candidatos: CandidatoDaEnquete[]) => Promise<Resposta>;
  inicial?: { vista: VistaNovaEnquete; todas?: boolean };
};

const ETAPAS: readonly Categoria[] = CATEGORIAS; // 8 fases + Outras perguntas
const TODAS_DO_BANCO = PERGUNTAS.map((p) => p.id);

export function TelaNovaEnquete({
  livro,
  causos,
  causoInicial = null,
  abrirEnquete,
  inicial = { vista: "como" },
}: Props) {
  const router = useRouter();
  const [vista, setVista] = useState<VistaNovaEnquete>(inicial.vista);
  const [doBanco, setDoBanco] = useState<string[]>(
    inicial.todas ? TODAS_DO_BANCO : [],
  );
  const [dosCausos, setDosCausos] = useState<string[]>(
    inicial.todas
      ? causos.map((c) => c.id)
      : causoInicial
        ? [causoInicial]
        : [],
  );
  const [proprias, setProprias] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const total = doBanco.length + dosCausos.length + proprias.length;
  const voltarParaPerguntas = `/livro/${livro.id}/perguntas?aba=enquete`;

  function escolherTodas() {
    setDoBanco(TODAS_DO_BANCO);
    setDosCausos(causos.map((c) => c.id));
    setVista("revisar");
  }

  function escolherAntes() {
    setDoBanco([]);
    setDosCausos(causoInicial ? [causoInicial] : []);
    setVista(0);
  }

  function abrir() {
    const candidatos: CandidatoDaEnquete[] = [
      // Em ordem de fase: a família vê as etapas na ordem da vida.
      ...PERGUNTAS.filter((p) => doBanco.includes(p.id)).map((p) => ({
        texto: p.texto,
        tipo: "pergunta" as const,
        banco_id: p.id,
      })),
      ...causos
        .filter((c) => dosCausos.includes(c.id))
        .map((c) => ({
          texto: textoSugerido(c),
          tipo: c.tipo,
          causo_id: c.id,
        })),
      ...proprias.map((texto) => ({ texto, tipo: "pergunta" as const })),
    ];
    iniciar(async () => {
      const r = await abrirEnquete(candidatos);
      if (!r.ok) return setErro(r.mensagem);
      router.push(voltarParaPerguntas);
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12">
      <Link
        href={voltarParaPerguntas}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Perguntas
      </Link>

      {vista === "como" ? (
        <Como
          aoTodas={escolherTodas}
          aoEscolher={escolherAntes}
          autor={livro.autor}
        />
      ) : vista === "revisar" ? (
        <Revisar
          doBanco={doBanco}
          causos={causos.filter((c) => dosCausos.includes(c.id))}
          proprias={proprias}
          total={total}
          erro={erro}
          pendente={pendente}
          aoMudar={(i) => setVista(i)}
          aoAbrir={abrir}
        />
      ) : (
        <Etapa
          indice={vista}
          doBanco={doBanco}
          aoMudarBanco={setDoBanco}
          causos={causos}
          dosCausos={dosCausos}
          aoMudarCausos={setDosCausos}
          proprias={proprias}
          aoMudarProprias={setProprias}
          aoVoltar={() => setVista(vista === 0 ? "como" : vista - 1)}
          aoAvancar={() =>
            setVista(vista === ETAPAS.length - 1 ? "revisar" : vista + 1)
          }
        />
      )}
    </main>
  );
}

// ── 1. Como montar ───────────────────────────────────────────────────────

function Como({
  aoTodas,
  aoEscolher,
  autor,
}: {
  aoTodas: () => void;
  aoEscolher: () => void;
  autor: string;
}) {
  const opcao =
    "rounded-cartao bg-papel border-linha hover:border-tinta-2 flex w-full flex-col gap-1 border p-5 text-left transition-colors";
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Nova enquete
        </h1>
        <p className="text-ui-17 text-tinta-2">
          Quais perguntas a família vê para escolher o que perguntar ao {autor}?
        </p>
      </div>
      <button type="button" className={opcao} onClick={aoTodas}>
        <span className="text-ui-20 text-tinta font-medium">
          Todas as perguntas
        </span>
        <span className="text-ui-15 text-tinta-2">
          A família escolhe entre as {PERGUNTAS.length}, fase por fase.
        </span>
      </button>
      <button type="button" className={opcao} onClick={aoEscolher}>
        <span className="text-ui-20 text-tinta font-medium">
          Eu escolho antes
        </span>
        <span className="text-ui-15 text-tinta-2">
          Você marca as perguntas de cada fase e revisa antes de abrir.
        </span>
      </button>
    </section>
  );
}

// ── 2. Uma etapa por fase ────────────────────────────────────────────────

function alternar(lista: string[], id: string) {
  return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
}

function Caixa({
  marcada,
  aoMudar,
  children,
}: {
  marcada: boolean;
  aoMudar: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={
        "rounded-interno min-h-alvo flex cursor-pointer items-start gap-3 border px-4 py-3 " +
        (marcada
          ? "border-floresta/40 bg-floresta-claro"
          : "border-linha bg-papel")
      }
    >
      <input
        type="checkbox"
        checked={marcada}
        onChange={aoMudar}
        className="accent-floresta mt-1 size-5 shrink-0"
      />
      <span className="font-livro text-livro-20 text-tinta">{children}</span>
    </label>
  );
}

function Etapa({
  indice,
  doBanco,
  aoMudarBanco,
  causos,
  dosCausos,
  aoMudarCausos,
  proprias,
  aoMudarProprias,
  aoVoltar,
  aoAvancar,
}: {
  indice: number;
  doBanco: string[];
  aoMudarBanco: (l: string[]) => void;
  causos: CausoDaTela[];
  dosCausos: string[];
  aoMudarCausos: (l: string[]) => void;
  proprias: string[];
  aoMudarProprias: (l: string[]) => void;
  aoVoltar: () => void;
  aoAvancar: () => void;
}) {
  const fase = ETAPAS[indice];
  const ultima = indice === ETAPAS.length - 1;
  const [rascunho, setRascunho] = useState("");
  const daFase = fase.id === OUTRAS.id ? [] : perguntasDoTema(fase.id);
  const marcadasNaFase =
    fase.id === OUTRAS.id
      ? dosCausos.length + proprias.length
      : daFase.filter((p) => doBanco.includes(p.id)).length;
  const todasMarcadas =
    daFase.length > 0 && daFase.every((p) => doBanco.includes(p.id));

  return (
    <section className="flex flex-col gap-6" aria-labelledby="titulo-etapa">
      <div className="flex flex-col gap-1">
        <p className="text-ui-15 text-tinta-2">
          Etapa {indice + 1} de {ETAPAS.length}
        </p>
        <h1
          id="titulo-etapa"
          className="font-livro text-livro-28 text-tinta leading-tight"
        >
          {fase.nome}
        </h1>
        <p className="text-ui-15 text-tinta-2" aria-live="polite">
          {marcadasNaFase === 1 ? "1 marcada" : `${marcadasNaFase} marcadas`}
        </p>
      </div>

      {fase.id === OUTRAS.id ? (
        <div className="flex flex-col gap-5">
          {causos.length ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-ui-17 text-tinta mb-2 font-medium">
                Sugestões da família
              </legend>
              {causos.map((c) => (
                <Caixa
                  key={c.id}
                  marcada={dosCausos.includes(c.id)}
                  aoMudar={() => aoMudarCausos(alternar(dosCausos, c.id))}
                >
                  {textoSugerido(c)}
                </Caixa>
              ))}
            </fieldset>
          ) : null}
          <div className="flex flex-col gap-2">
            <p className="text-ui-17 text-tinta font-medium">Sua pergunta</p>
            {proprias.map((t, i) => (
              <Caixa
                key={i}
                marcada
                aoMudar={() =>
                  aoMudarProprias(proprias.filter((_, k) => k !== i))
                }
              >
                {t}
              </Caixa>
            ))}
            <div className="flex gap-2">
              <input
                value={rascunho}
                maxLength={TEXTO_PERGUNTA_MAX}
                onChange={(e) => setRascunho(e.target.value)}
                aria-label="Sua pergunta"
                placeholder="Escreva e toque em Pôr"
                className="rounded-interno border-linha-forte bg-papel text-ui-17 min-h-alvo min-w-0 flex-1 border px-4"
              />
              <Botao
                variante="secundario"
                disabled={rascunho.trim().length < 3}
                onClick={() => {
                  aoMudarProprias([...proprias, rascunho.trim()]);
                  setRascunho("");
                }}
              >
                Pôr
              </Botao>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Botao
            variante="texto"
            className="self-start"
            onClick={() =>
              aoMudarBanco(
                todasMarcadas
                  ? doBanco.filter((id) => !daFase.some((p) => p.id === id))
                  : [
                      ...doBanco,
                      ...daFase
                        .map((p) => p.id)
                        .filter((id) => !doBanco.includes(id)),
                    ],
              )
            }
          >
            {todasMarcadas ? "Desmarcar todas" : "Marcar todas"}
          </Botao>
          <ul className="flex flex-col gap-2">
            {daFase.map((p) => (
              <li key={p.id}>
                <Caixa
                  marcada={doBanco.includes(p.id)}
                  aoMudar={() => aoMudarBanco(alternar(doBanco, p.id))}
                >
                  {p.texto}
                  {p.fe ? (
                    <span className="text-ui-13 bg-polen-2 text-tinta-2 rounded-chip font-ui ml-2 px-2 py-0.5 align-middle">
                      fé
                    </span>
                  ) : null}
                </Caixa>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-polen sticky bottom-0 -mx-5 flex items-center gap-3 px-5 py-3">
        <Botao variante="secundario" onClick={aoVoltar}>
          Voltar
        </Botao>
        <Botao className="flex-1" onClick={aoAvancar}>
          {ultima ? "Revisar" : "Próxima"}
        </Botao>
      </div>
    </section>
  );
}

// ── 3. Revisar antes de abrir ────────────────────────────────────────────

function Revisar({
  doBanco,
  causos,
  proprias,
  total,
  erro,
  pendente,
  aoMudar,
  aoAbrir,
}: {
  doBanco: string[];
  causos: CausoDaTela[];
  proprias: string[];
  total: number;
  erro: string | null;
  pendente: boolean;
  aoMudar: (etapa: number) => void;
  aoAbrir: () => void;
}) {
  const grupos = ETAPAS.map((fase, i) => ({
    fase,
    indice: i,
    textos:
      fase.id === OUTRAS.id
        ? [...causos.map(textoSugerido), ...proprias]
        : perguntasDoTema(fase.id)
            .filter((p) => doBanco.includes(p.id))
            .map((p) => p.texto),
  }));
  const comItens = grupos.filter((g) => g.textos.length);
  const fases = comItens.filter((g) => g.fase.id !== OUTRAS.id).length;
  const demais = total > MAX_ITENS_ENQUETE;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Revisar a enquete
        </h1>
        <p className="text-ui-17 text-tinta-2">
          {total === 1 ? "1 pergunta" : `${total} perguntas`}
          {fases ? ` em ${fases} ${fases === 1 ? "fase" : "fases"}` : ""}. Cada
          pessoa marca até {VOTOS_POR_FASE} por fase.
        </p>
      </div>

      {comItens.length ? (
        <ul className="flex flex-col gap-3">
          {comItens.map((g) => (
            <li
              key={g.fase.id}
              className="rounded-cartao bg-papel border-linha flex flex-col gap-2 border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-ui-17 text-tinta font-medium">
                  {g.fase.nome}{" "}
                  <span className="text-tinta-2 font-normal">
                    · {g.textos.length}
                  </span>
                </p>
                <Botao variante="texto" onClick={() => aoMudar(g.indice)}>
                  Mudar
                </Botao>
              </div>
              <details>
                <summary className="text-ui-15 text-tinta-2 min-h-11 cursor-pointer">
                  Ver as perguntas
                </summary>
                <ul className="flex flex-col gap-2 pt-2">
                  {g.textos.map((t, k) => (
                    <li key={k} className="font-livro text-livro-20 text-tinta">
                      {t}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ui-17 text-tinta-2">Nenhuma pergunta marcada.</p>
      )}

      {demais ? (
        <p role="alert" className="text-ui-15 text-erro">
          No máximo {MAX_ITENS_ENQUETE} perguntas. Tire{" "}
          {total - MAX_ITENS_ENQUETE}.
        </p>
      ) : total < 2 ? (
        <p className="text-ui-15 text-tinta-2">
          Marque pelo menos 2 perguntas.
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-ui-15 text-erro">
          {erro}
        </p>
      ) : null}

      <div className="bg-polen sticky bottom-0 -mx-5 flex items-center gap-3 px-5 py-3">
        <Botao variante="secundario" onClick={() => aoMudar(ETAPAS.length - 1)}>
          Voltar
        </Botao>
        <Botao
          className="flex-1"
          carregando={pendente}
          disabled={total < 2 || demais}
          onClick={aoAbrir}
        >
          Abrir enquete
        </Botao>
      </div>
    </section>
  );
}
