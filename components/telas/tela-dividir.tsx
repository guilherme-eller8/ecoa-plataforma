"use client";

// Confira as histórias (prompt 7, design seção 7). A IA propôs as histórias de uma conversa ou
// de um lote; aqui a pessoa ouve os trechos e acerta com 1 toque: juntar, separar, tirar e
// renomear. Nada vai ao servidor antes de "Escrever N histórias" (D4): os ajustes ficam num
// rascunho no aparelho, só com ids, apagado ao confirmar e depois de 7 dias.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { IconePausa, IconeTocar } from "@/components/ui/icones";
import { SugestaoDePergunta } from "@/components/ui/sugestao-pergunta";
import { TRECHO_ALVO_S } from "@/lib/config";
import type { AcoesDivisao, DivisaoDaTela } from "@/lib/divisao/tipos";
import {
  cargaDoConfirmar,
  cortarTrechos,
  duracaoS,
  inicioDoTexto,
  juntar,
  montar,
  relogio,
  renomear,
  responderSugestao,
  separar,
  tirar,
  type HistoriaTela,
} from "@/lib/divisao/trechos";
import type { LivroDaTela } from "@/lib/livro/tipos";
import { falarDuracao } from "@/lib/ui/tempo";

const SETE_DIAS = 7 * 24 * 3600_000;

type Rascunho = {
  salvoEm: number;
  historias: {
    titulo: string | null;
    ids: number[];
    promptId: string | null;
    sugeridaId: string | null;
    ignorada: boolean;
  }[];
  ajustes: Ajustes;
};
type Ajustes = {
  juntou: number;
  separou: number;
  tirou: number;
  renomeou: number;
};
const SEM_AJUSTES: Ajustes = { juntou: 0, separou: 0, tirou: 0, renomeou: 0 };

function chaveDoRascunho(historiaId: string) {
  return `ecoa-divisao-${historiaId}`;
}

function lerRascunho(historiaId: string): Rascunho | null {
  try {
    const bruto = localStorage.getItem(chaveDoRascunho(historiaId));
    if (!bruto) return null;
    const r = JSON.parse(bruto) as Rascunho;
    if (!r?.historias || Date.now() - r.salvoEm > SETE_DIAS) {
      localStorage.removeItem(chaveDoRascunho(historiaId));
      return null;
    }
    return r;
  } catch {
    return null;
  }
}

function salvarRascunho(
  historiaId: string,
  lista: HistoriaTela[],
  ajustes: Ajustes,
) {
  try {
    const r: Rascunho = {
      salvoEm: Date.now(),
      ajustes,
      historias: lista.map((h) => ({
        titulo: h.titulo,
        ids: h.trechos.flatMap((t) => t.ids),
        promptId: h.promptId,
        sugeridaId: h.sugeridaId,
        ignorada: h.ignorada,
      })),
    };
    localStorage.setItem(chaveDoRascunho(historiaId), JSON.stringify(r));
  } catch {
    // Sem armazenamento (aba privada): os ajustes valem só nesta tela.
  }
}

function apagarRascunho(historiaId: string) {
  try {
    localStorage.removeItem(chaveDoRascunho(historiaId));
  } catch {}
}

export function TelaDividir({
  livro,
  divisao,
  acoes,
}: {
  livro: LivroDaTela;
  divisao: DivisaoDaTela;
  acoes: AcoesDivisao;
}) {
  const router = useRouter();
  const proposta = useMemo(
    () => montar(divisao.propostas, divisao.segmentos, TRECHO_ALVO_S),
    [divisao],
  );
  const [lista, setLista] = useState<HistoriaTela[]>(proposta);
  const [ajustes, setAjustes] = useState<Ajustes>(SEM_AJUSTES);
  const [anterior, setAnterior] = useState<HistoriaTela[] | null>(null); // desfazer o "Tirar"
  const [separando, setSeparando] = useState<number | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Rascunho do aparelho (só depois de montar: o servidor não tem localStorage).
  const carregou = useRef(false);
  useEffect(() => {
    if (carregou.current || divisao.situacao !== "separar") return;
    carregou.current = true;
    const r = lerRascunho(divisao.historiaId);
    if (!r) return;
    const porId = new Map(divisao.segmentos.map((s) => [s.id, s]));
    const restaurada = r.historias
      .map((h) => {
        const segs = h.ids.flatMap((id) => {
          const s = porId.get(id);
          return s ? [s] : [];
        });
        return {
          chave: String(segs[0]?.id ?? 0),
          titulo: h.titulo,
          trechos: cortarTrechos(segs, TRECHO_ALVO_S),
          promptId: h.promptId,
          sugeridaId: h.sugeridaId,
          ignorada: h.ignorada,
        };
      })
      .filter((h) => h.trechos.length > 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- rascunho só existe no navegador
    setLista(restaurada);
    setAjustes(r.ajustes ?? SEM_AJUSTES);
  }, [divisao]);

  function mudar(nova: HistoriaTela[], ajuste?: keyof Ajustes) {
    const novos = ajuste
      ? { ...ajustes, [ajuste]: ajustes[ajuste] + 1 }
      : ajustes;
    setLista(nova);
    setAjustes(novos);
    setErro(null);
    salvarRascunho(divisao.historiaId, nova, novos);
  }

  // ── Um player só: ▶ toca o trecho do áudio original e para no fim dele ──
  const audio = useRef<HTMLAudioElement | null>(null);
  const [tocando, setTocando] = useState<string | null>(null);
  const fimDoTrecho = useRef<number>(0);
  const urlDe = useMemo(
    () => new Map(divisao.audios.map((a) => [a.gravacao, a.url])),
    [divisao.audios],
  );
  function tocar(chave: string, gravacao: string, inicio: number, fim: number) {
    const a = audio.current;
    const url = urlDe.get(gravacao);
    if (!a || !url) return;
    if (tocando === chave) {
      a.pause();
      setTocando(null);
      return;
    }
    if (a.dataset.gravacao !== gravacao) {
      a.src = url;
      a.dataset.gravacao = gravacao;
    }
    fimDoTrecho.current = fim;
    const comecar = () => {
      a.currentTime = inicio;
      void a.play().catch(() => setTocando(null));
    };
    if (a.readyState >= 1) comecar();
    else a.addEventListener("loadedmetadata", comecar, { once: true });
    setTocando(chave);
  }

  async function confirmar(carga = cargaDoConfirmar(lista)) {
    setEnviando(true);
    setErro(null);
    const r = await acoes.confirmar(carga, ajustes);
    if (!r.ok) {
      setEnviando(false);
      setErro(r.mensagem);
      return;
    }
    apagarRascunho(divisao.historiaId);
    router.push(`/livro/${livro.id}`);
  }

  const voltar = (
    <Link
      href={`/livro/${livro.id}`}
      className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
    >
      ← Livro do {livro.autor}
    </Link>
  );
  const moldura =
    "mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-32";

  if (divisao.situacao === "confirmada")
    return (
      <main className={moldura}>
        {voltar}
        <EstadoVazio
          frase="Estas histórias já foram para a escrita."
          acao={
            <Link
              href={`/livro/${livro.id}/historias`}
              className={classesDoBotao()}
            >
              Ver histórias
            </Link>
          }
        />
      </main>
    );

  const n = lista.length;
  const podeEscrever = livro.podeEscrever && !enviando;

  return (
    <main className={moldura}>
      {voltar}
      <audio
        ref={audio}
        preload="none"
        className="hidden"
        onTimeUpdate={(e) => {
          if (e.currentTarget.currentTime >= fimDoTrecho.current) {
            e.currentTarget.pause();
            setTocando(null);
          }
        }}
        onEnded={() => setTocando(null)}
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          {n === 1 ? "1 história" : `${n} histórias`}
        </h1>
        <p className="text-ui-17 text-tinta-2">Confira antes de escrever.</p>
      </header>

      {n > 0 ? (
        <DicaPrimeiraVez chave="dividir">
          Juntar une com a de baixo. Separar corta onde você tocar.
        </DicaPrimeiraVez>
      ) : null}

      {anterior ? (
        <div className="bg-polen-2 text-ui-15 text-tinta flex items-center justify-between gap-3 rounded-2xl py-2 pr-2 pl-4">
          <p>Trecho fora das histórias. O áudio continua guardado.</p>
          <Botao
            variante="texto"
            onClick={() => {
              setLista(anterior);
              setAjustes((a) => ({ ...a, tirou: Math.max(0, a.tirou - 1) }));
              salvarRascunho(divisao.historiaId, anterior, ajustes);
              setAnterior(null);
            }}
          >
            Desfazer
          </Botao>
        </div>
      ) : null}

      {n === 0 ? (
        <EstadoVazio
          frase="Nenhum trecho sobrou."
          acao={
            <div className="flex flex-col items-start gap-2">
              <Botao
                onClick={() => {
                  mudar(proposta);
                  setAjustes(SEM_AJUSTES);
                  setAnterior(null);
                }}
              >
                Recomeçar
              </Botao>
              <Botao
                variante="texto"
                disabled={!podeEscrever}
                onClick={() => {
                  if (
                    window.confirm(
                      "Deixar esta gravação fora do livro? O áudio continua guardado.",
                    )
                  )
                    void confirmar([]);
                }}
              >
                Deixar fora do livro
              </Botao>
            </div>
          }
        />
      ) : (
        <ol className="flex flex-col gap-4">
          {lista.map((h, i) => (
            <li
              key={h.chave}
              className="rounded-cartao bg-papel border-linha flex flex-col gap-4 border p-5"
            >
              {editando === i ? (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    mudar(renomear(lista, i, titulo), "renomeou");
                    setEditando(null);
                  }}
                >
                  <Campo
                    rotulo="Título"
                    value={titulo}
                    maxLength={200}
                    autoFocus
                    onChange={(e) => setTitulo(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Botao type="submit" variante="secundario">
                      Salvar
                    </Botao>
                    <Botao variante="texto" onClick={() => setEditando(null)}>
                      Cancelar
                    </Botao>
                  </div>
                </form>
              ) : (
                <header className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTitulo(h.titulo ?? "");
                      setEditando(i);
                    }}
                    className="font-livro text-livro-24 text-tinta text-left leading-snug"
                    aria-label={`Renomear: ${h.titulo ?? "História sem título"}`}
                  >
                    {h.titulo ?? (
                      <span className="text-tinta-2">
                        Toque para dar um título
                      </span>
                    )}
                  </button>
                  <p className="text-ui-15 text-tinta-2">
                    {h.trechos.length === 1
                      ? "1 trecho"
                      : `${h.trechos.length} trechos`}{" "}
                    ·{" "}
                    <span className="num">
                      {falarDuracao(Math.round(duracaoS(h)))}
                    </span>
                  </p>
                </header>
              )}

              {h.promptId && divisao.perguntas[h.promptId] ? (
                <p className="text-ui-15 text-tinta-2">
                  Responde: {divisao.perguntas[h.promptId]}
                </p>
              ) : h.sugeridaId && divisao.perguntas[h.sugeridaId] ? (
                <SugestaoDePergunta
                  pergunta={divisao.perguntas[h.sugeridaId]}
                  aoAceitar={() => mudar(responderSugestao(lista, i, true))}
                  aoIgnorar={() => mudar(responderSugestao(lista, i, false))}
                />
              ) : null}

              <ul className="flex flex-col">
                {h.trechos.map((t, k) => (
                  <li key={t.chave} className="flex flex-col">
                    {separando === i && k > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          mudar(separar(lista, i, k), "separou");
                          setSeparando(null);
                        }}
                        className="text-ui-15 text-floresta border-floresta/50 min-h-alvo my-1 rounded-2xl border border-dashed font-medium"
                      >
                        Separar aqui
                      </button>
                    ) : null}
                    <div className="border-linha flex items-start gap-3 border-t py-3 first:border-t-0">
                      <button
                        type="button"
                        onClick={() =>
                          tocar(t.chave, t.gravacao, t.inicio, t.fim)
                        }
                        aria-label={
                          tocando === t.chave
                            ? "Pausar o trecho"
                            : `Ouvir o trecho de ${relogio(t.inicio)}`
                        }
                        className="bg-polen-2 text-floresta flex size-11 shrink-0 items-center justify-center rounded-full"
                      >
                        {tocando === t.chave ? (
                          <IconePausa tamanho={18} />
                        ) : (
                          <IconeTocar tamanho={18} />
                        )}
                      </button>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="text-ui-13 text-tinta-2 num">
                          {divisao.audios.length > 1
                            ? `Parte ${t.parte} · `
                            : ""}
                          {relogio(t.inicio)}
                        </p>
                        <p className="font-livro text-livro-20 text-tinta leading-snug">
                          {inicioDoTexto(t.texto)}
                        </p>
                      </div>
                      <Botao
                        variante="texto"
                        aria-label={`Tirar o trecho de ${relogio(t.inicio)}`}
                        onClick={() => {
                          setAnterior(lista);
                          mudar(tirar(lista, i, k), "tirou");
                        }}
                      >
                        Tirar
                      </Botao>
                    </div>
                  </li>
                ))}
              </ul>

              <footer className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {separando === i ? (
                  <Botao variante="texto" onClick={() => setSeparando(null)}>
                    Cancelar
                  </Botao>
                ) : (
                  <>
                    {i < n - 1 ? (
                      <Botao
                        variante="secundario"
                        onClick={() => mudar(juntar(lista, i), "juntou")}
                      >
                        Juntar com a de baixo
                      </Botao>
                    ) : null}
                    {h.trechos.length > 1 ? (
                      <Botao variante="texto" onClick={() => setSeparando(i)}>
                        Separar
                      </Botao>
                    ) : null}
                  </>
                )}
              </footer>
            </li>
          ))}
        </ol>
      )}

      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}

      {n > 0 ? (
        <div className="bg-polen/95 border-linha fixed inset-x-0 bottom-0 border-t px-5 py-4 backdrop-blur">
          <div className="mx-auto w-full max-w-xl">
            <Botao
              larguraTotal
              carregando={enviando}
              disabled={!podeEscrever}
              onClick={() => void confirmar()}
            >
              {enviando
                ? "Enviando…"
                : n === 1
                  ? "Escrever 1 história"
                  : `Escrever ${n} histórias`}
            </Botao>
          </div>
        </div>
      ) : null}
    </main>
  );
}
