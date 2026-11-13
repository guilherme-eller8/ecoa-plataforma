"use client";

// Editor da história pronta (prompt 8, M6). Celular: abas Texto e Áudio. Computador: áudio e
// transcrição à esquerda, texto à direita. Salvamento automático com cópia no aparelho até o
// servidor confirmar; trava "Ana está editando" conferida no banco. Uma ação principal:
// Marcar como pronta. Design: docs/designs/editor-historias.md.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EditorTexto,
  type ApiDoTexto,
  type FraseTocada,
} from "@/components/editor/editor-texto";
import { FotosDaHistoria } from "@/components/editor/fotos-historia";
import { usePlayer } from "@/components/editor/player";
import { Transcricao } from "@/components/editor/transcricao";
import { Aviso } from "@/components/ui/aviso";
import { AvisoSalvo, type EstadoSalvo } from "@/components/ui/aviso-salvo";
import { Botao } from "@/components/ui/botao";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { IconeCheck, IconePausa, IconeTocar } from "@/components/ui/icones";
import { SugestaoDePergunta } from "@/components/ui/sugestao-pergunta";
import type { Marcacao } from "@/lib/ai/schemas";
import {
  CONSULTAR_TRAVA_S,
  RENOVAR_TRAVA_S,
  SALVAR_APOS_MS,
  SALVAR_NO_MAXIMO_MS,
} from "@/lib/config";
import {
  doDocumento,
  lerAno,
  paraDocumento,
  type AtributosConfira,
  type TextoDaHistoria,
} from "@/lib/editor/conteudo";
import { minutos, segmentoDaFrase } from "@/lib/editor/ouvir";
import {
  abaDestaGuia,
  type AcoesEditor,
  type EstadoTrava,
} from "@/lib/editor/tipos";
import type { HistoriaParaEditar } from "@/lib/historias/tipos";

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

type Copia = {
  rev: number;
  texto: TextoDaHistoria;
  marcacoes: Marcacao[];
  em: number;
};

const chaveCopia = (h: string) => `ecoa-texto-${h}`;
function lerCopia(h: string): Copia | null {
  try {
    const c = JSON.parse(localStorage.getItem(chaveCopia(h)) ?? "null");
    return c && typeof c.rev === "number" && c.texto ? (c as Copia) : null;
  } catch {
    return null;
  }
}
function gravarCopia(h: string, c: Copia | null) {
  try {
    if (c) localStorage.setItem(chaveCopia(h), JSON.stringify(c));
    else localStorage.removeItem(chaveCopia(h));
  } catch {}
}

type Trava = EstadoTrava | "abrindo" | "fechado";

export function TelaEditor({
  historia,
  podeEscrever,
  acoes,
}: {
  historia: HistoriaParaEditar;
  podeEscrever: boolean;
  acoes: AcoesEditor;
}) {
  const router = useRouter();
  const base = `/livro/${historia.livroId}/historias/${historia.id}`;
  const api = useRef<ApiDoTexto>(null);
  const aba = useRef<string>("");
  const rev = useRef(historia.rev);
  const sujo = useRef(false);
  const salvando = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeiraMudanca = useRef<number | null>(null);
  const ultimaRenovacao = useRef(0);
  const agendarRef = useRef<() => void>(() => {});
  const originais = useMemo(
    () => new Map(historia.texto.paragrafos.map((p) => [p.id, p.texto])),
    [historia.texto.paragrafos],
  );
  const inicial = useMemo(
    () => paraDocumento(historia.texto, historia.marcacoes),
    [historia.texto, historia.marcacoes],
  );

  const [painel, setPainel] = useState<"texto" | "audio">("texto");
  const [titulo, setTitulo] = useState(historia.texto.titulo);
  const [ano, setAno] = useState(historia.texto.ano?.toString() ?? "");
  const anoLido = lerAno(ano);
  const [trava, setTrava] = useState<Trava>(
    podeEscrever ? "abrindo" : "fechado",
  );
  const [salvo, setSalvo] = useState<EstadoSalvo>("parado");
  const [semInternet, setSemInternet] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiaVelha, setCopiaVelha] = useState<Copia | null>(null);
  const [frase, setFrase] = useState<
    (FraseTocada & { posicao: { top: number; left: number } }) | null
  >(null);
  const [grifo, setGrifo] = useState<AtributosConfira | null>(null);
  const [fontesDoCursor, setFontesDoCursor] = useState<number[]>([]);
  const [revisada, setRevisada] = useState(historia.revisada);
  const [marcando, setMarcando] = useState(false);
  const [sugestao, setSugestao] = useState(historia.sugestao);
  const [respondida, setRespondida] = useState<string | null>(null);
  const colunaTexto = useRef<HTMLDivElement>(null);

  const editando = typeof trava === "object" && trava.editando;
  const {
    elemento: elementoDoAudio,
    tocar,
    alternar,
    tocando,
    atual,
    tempo,
    aoAtualizar,
    aoTocar,
    aoPausar,
    temAudio,
  } = usePlayer(historia.audios, historia.segmentos);
  const porId = useMemo(
    () => new Map(historia.segmentos.map((s) => [s.id, s])),
    [historia.segmentos],
  );

  // ── Salvar ──────────────────────────────────────────────────────────────
  const montar = useCallback(() => {
    const doc = api.current?.documento();
    if (!doc) return null;
    const a = lerAno(ano);
    return doDocumento(
      doc,
      {
        titulo,
        ano: a === "invalido" ? (historia.texto.ano ?? null) : a,
        lacunas: historia.texto.lacunas,
      },
      originais,
    );
  }, [ano, titulo, historia.texto.ano, historia.texto.lacunas, originais]);

  const montarRef = useRef(montar);
  useEffect(() => {
    montarRef.current = montar;
  });

  const salvarAgora = useCallback(async (): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (salvando.current) {
      await salvando.current;
      if (!sujo.current) return;
    }
    if (!sujo.current) return;
    const m = montarRef.current();
    if (!m) return;
    sujo.current = false;
    primeiraMudanca.current = null;
    const copia: Copia = { rev: rev.current, ...m, em: Date.now() };
    gravarCopia(historia.id, copia);
    setSalvo("salvando");
    const tarefa = (async () => {
      try {
        const r = await acoes.salvar(
          aba.current,
          rev.current,
          m.texto,
          m.marcacoes,
        );
        if (r.ok) {
          rev.current = r.rev;
          setSemInternet(false);
          if (!sujo.current) {
            gravarCopia(historia.id, null);
            setSalvo("salvo");
          }
          return;
        }
        setSalvo("parado");
        if (r.motivo === "trava") {
          setTrava({ editando: false, outraTela: false, nome: null });
          setAviso(
            "Outra tela começou a editar. O que você escreveu ficou guardado neste aparelho.",
          );
        } else if (r.motivo === "desatualizado") {
          setAviso(
            "O texto mudou em outra tela. Atualize para continuar; o seu ficou guardado neste aparelho.",
          );
          setTrava({ editando: false, outraTela: true, nome: null });
        } else {
          sujo.current = true;
          setSalvo("erro");
        }
      } catch {
        // Sem internet: a cópia fica no aparelho e tenta de novo.
        sujo.current = true;
        setSemInternet(true);
        setSalvo("parado");
        timer.current = setTimeout(() => agendarRef.current(), 5000);
      }
    })();
    salvando.current = tarefa;
    await tarefa;
    salvando.current = null;
    if (sujo.current && !timer.current) agendarRef.current();
  }, [acoes, historia.id]);

  const agendar = useCallback(() => {
    const agora = Date.now();
    primeiraMudanca.current ??= agora;
    if (timer.current) clearTimeout(timer.current);
    const espera = Math.min(
      SALVAR_APOS_MS,
      Math.max(0, primeiraMudanca.current + SALVAR_NO_MAXIMO_MS - agora),
    );
    timer.current = setTimeout(() => void salvarAgora(), espera);
  }, [salvarAgora]);
  useEffect(() => {
    agendarRef.current = agendar;
  });

  // ── Trava ───────────────────────────────────────────────────────────────
  const pegar = useCallback(
    async (assumir = false) => {
      const r = await acoes.editar(aba.current, { pegar: true, assumir });
      if (!r.ok) {
        setTrava("fechado");
        setAviso(r.mensagem);
        return false;
      }
      ultimaRenovacao.current = Date.now();
      setTrava(r.dados);
      if (r.dados.editando) setAviso(null);
      return r.dados.editando;
    },
    [acoes],
  );

  const atividade = useCallback(() => {
    if (!editando) return;
    if (Date.now() - ultimaRenovacao.current < RENOVAR_TRAVA_S * 1000) return;
    ultimaRenovacao.current = Date.now();
    void pegar();
  }, [editando, pegar]);

  // Abrir: pega a trava e recupera o que ficou no aparelho.
  useEffect(() => {
    aba.current = abaDestaGuia();
    if (!podeEscrever) return;
    let vivo = true;
    void (async () => {
      const ok = await pegar();
      if (!vivo) return;
      const copia = lerCopia(historia.id);
      if (!copia) return;
      if (copia.rev === historia.rev && ok) {
        api.current?.definir(paraDocumento(copia.texto, copia.marcacoes));
        setTitulo(copia.texto.titulo);
        setAno(copia.texto.ano?.toString() ?? "");
        sujo.current = true;
        setAviso("Recuperamos o que não tinha sido salvo.");
        agendar();
      } else if (copia.rev !== historia.rev) setCopiaVelha(copia);
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir
  }, []);

  // Quem está vendo confere se a trava soltou (sem pegar nada).
  useEffect(() => {
    if (typeof trava !== "object" || trava.editando) return;
    const t = setInterval(async () => {
      const r = await acoes.editar(aba.current, { pegar: false });
      if (r.ok) setTrava(r.dados);
    }, CONSULTAR_TRAVA_S * 1000);
    return () => clearInterval(t);
  }, [trava, acoes]);

  // Sair: salva o que falta, guarda a sessão como versão e solta a trava.
  useEffect(() => {
    if (!editando) return;
    const sair = () => {
      if (sujo.current) void salvarAgora();
      try {
        navigator.sendBeacon(`${base}/parar`, aba.current);
      } catch {}
    };
    const escondeu = () => {
      if (document.visibilityState === "hidden") void salvarAgora();
    };
    window.addEventListener("pagehide", sair);
    document.addEventListener("visibilitychange", escondeu);
    return () => {
      window.removeEventListener("pagehide", sair);
      document.removeEventListener("visibilitychange", escondeu);
    };
  }, [editando, base, salvarAgora]);

  useEffect(
    () => () => {
      // Navegação dentro do app (ex.: Histórico): salva e solta.
      void (async () => {
        await salvarAgora();
        await acoes.pararDeEditar(aba.current);
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao sair da tela
    [],
  );

  function mudou() {
    sujo.current = true;
    setSalvo((s) => (s === "salvo" ? "parado" : s));
    atividade();
    agendar();
  }

  // ── Ouvir ──────────────────────────────────────────────────────────────
  function ouvirFrase() {
    if (!frase) return;
    const s = segmentoDaFrase(frase.frase, frase.fontes, porId);
    setFrase(null);
    if (s) tocar(s, true);
  }

  function tocouFrase(f: FraseTocada | null) {
    const caixa = colunaTexto.current?.getBoundingClientRect();
    if (!f || !temAudio || !f.fontes.length || !caixa) {
      setFrase(null);
      return;
    }
    setFrase({
      ...f,
      posicao: {
        top: f.base - caixa.top + 6,
        left: Math.max(0, Math.min(f.esquerda - caixa.left, caixa.width - 130)),
      },
    });
  }

  async function marcar(pronta: boolean) {
    setMarcando(true);
    await salvarAgora();
    const r = await acoes.marcarPronta(pronta);
    setMarcando(false);
    if (!r.ok) return setAviso(r.mensagem);
    setRevisada(pronta);
    router.refresh();
  }

  async function responder(aceitar: boolean) {
    if (!acoes.responderSugestao || !sugestao) return;
    const r = await acoes.responderSugestao(aceitar);
    if (!r.ok) return setAviso(r.mensagem);
    if (aceitar) setRespondida(sugestao.texto);
    setSugestao(null);
  }

  const destacados = useMemo(() => new Set(fontesDoCursor), [fontesDoCursor]);
  const somenteLeitura = !editando;

  // ── Tela ───────────────────────────────────────────────────────────────
  const faixaDaTrava =
    typeof trava === "object" && !trava.editando ? (
      <div className="bg-aviso-fundo text-aviso rounded-interno flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="text-ui-17">
          {trava.nome
            ? `${trava.nome} está editando.`
            : trava.outraTela
              ? "Você está editando em outra tela."
              : "Ninguém está editando agora."}
        </p>
        {trava.outraTela ? (
          <Botao variante="secundario" onClick={() => void pegar(true)}>
            Editar aqui
          </Botao>
        ) : !trava.nome ? (
          <Botao variante="secundario" onClick={() => void pegar()}>
            Editar agora
          </Botao>
        ) : null}
      </div>
    ) : null;

  const textoDaHistoria = (
    <div ref={colunaTexto} className="relative flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {/* O título editável é o título da tela. */}
        <h1 className="flex">
          <label htmlFor="titulo" className="sr-only">
            Título
          </label>
          <textarea
            id="titulo"
            rows={1}
            value={titulo}
            readOnly={somenteLeitura}
            maxLength={200}
            placeholder="Título"
            onChange={(e) => {
              setTitulo(e.currentTarget.value.replace(/\n/g, " "));
              mudou();
            }}
            className="font-livro text-livro-28 text-tinta placeholder:text-tinta-2 field-sizing-content w-full resize-none bg-transparent leading-tight outline-none focus-visible:outline-none"
          />
        </h1>
        <div
          className={
            "flex items-center gap-3" +
            (somenteLeitura && !ano ? " hidden" : "")
          }
        >
          <label htmlFor="ano" className="text-ui-15 text-tinta-2">
            Ano
          </label>
          <input
            id="ano"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={ano}
            readOnly={somenteLeitura}
            placeholder="?"
            onChange={(e) => {
              setAno(e.currentTarget.value.replace(/\D/g, ""));
              mudou();
            }}
            aria-invalid={anoLido === "invalido"}
            className="border-linha-forte bg-papel text-ui-17 text-tinta placeholder:text-tinta-2/60 rounded-interno num min-h-11 w-24 border px-3"
          />
          {anoLido === "invalido" ? (
            <span className="text-ui-15 text-erro">
              Use 4 números, como 1962.
            </span>
          ) : null}
        </div>
        {historia.pergunta || respondida ? (
          <p className="text-ui-15 text-tinta-2">
            Responde: {historia.pergunta ?? respondida}
          </p>
        ) : null}
      </div>

      {sugestao && acoes.responderSugestao && editando ? (
        <SugestaoDePergunta
          pergunta={sugestao.texto}
          ocupado={false}
          aoAceitar={() => void responder(true)}
          aoIgnorar={() => void responder(false)}
        />
      ) : null}

      {temAudio ? (
        <DicaPrimeiraVez chave="editor-ouvir">
          Toque numa frase e em Ouvir para escutar a voz.
        </DicaPrimeiraVez>
      ) : null}

      <EditorTexto
        ref={api}
        inicial={inicial}
        editavel={editando}
        aoMudar={mudou}
        aoAtividade={atividade}
        aoTocarFrase={tocouFrase}
        aoTocarGrifo={setGrifo}
        aoMudarParagrafo={setFontesDoCursor}
      />

      {frase ? (
        <button
          type="button"
          onClick={ouvirFrase}
          style={frase.posicao}
          className="bg-tinta text-papel text-ui-15 shadow-flutuante animate-surgir absolute z-10 inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-medium"
        >
          <IconeTocar tamanho={18} />
          Ouvir
        </button>
      ) : null}

      {historia.texto.lacunas.length ? (
        <section className="rounded-cartao bg-papel flex flex-col gap-3 p-5">
          <h2 className="text-ui-17 text-tinta font-medium">
            Para a próxima conversa
          </h2>
          <ul className="text-ui-17 text-tinta-2 flex list-disc flex-col gap-2 pl-5">
            {historia.texto.lacunas.map((l, i) => (
              <li key={i}>{l.pergunta}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <FotosDaHistoria
        inicial={historia.fotos}
        editavel={podeEscrever && trava !== "fechado"}
        acoes={acoes}
      />

      {podeEscrever ? (
        revisada ? (
          <div className="bg-floresta-claro rounded-cartao mt-4 flex flex-wrap items-center justify-between gap-3 py-3 pr-3 pl-5">
            <p className="text-ui-17 text-floresta inline-flex items-center gap-2 font-medium">
              <IconeCheck tamanho={20} />
              Pronta para o livro
            </p>
            <Botao
              variante="texto"
              carregando={marcando}
              onClick={() => void marcar(false)}
            >
              Voltar para rascunho
            </Botao>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <Botao
              larguraTotal
              carregando={marcando}
              onClick={() => void marcar(true)}
              className="sm:w-auto sm:self-start"
            >
              Marcar como pronta
            </Botao>
          </div>
        )
      ) : null}
    </div>
  );

  // Fala da história: do 1º ao último segmento de cada gravação, somado.
  const faixas = new Map<string, [number, number]>();
  for (const s of historia.segmentos) {
    const f = faixas.get(s.gravacao);
    faixas.set(
      s.gravacao,
      f ? [Math.min(f[0], s.inicio), Math.max(f[1], s.fim)] : [s.inicio, s.fim],
    );
  }
  const duracao = [...faixas.values()].reduce((t, [a, b]) => t + b - a, 0);
  const audioDaHistoria = (
    <div className="flex flex-col gap-4">
      <h2 className="text-ui-15 text-tinta-2 flex gap-2 font-medium">
        <span>O que foi falado</span>
        {duracao ? <span className="num">· {minutos(duracao)}</span> : null}
      </h2>
      <Transcricao
        segmentos={historia.segmentos}
        atual={atual?.id ?? null}
        destacados={destacados}
        aoTocar={(s) => tocar(s, false)}
      />
    </div>
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-5 pt-6 pb-32 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link
          href={`/livro/${historia.livroId}/historias`}
          className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center"
        >
          ← Histórias
        </Link>
        <div className="flex items-center gap-4">
          {semInternet ? (
            <p role="status" className="text-ui-15 text-aviso">
              Sem internet. Guardado neste aparelho.
            </p>
          ) : (
            <AvisoSalvo estado={salvo} />
          )}
          {historia.versoes > 1 || podeEscrever ? (
            <Link
              href={`${base}/versoes`}
              className="text-ui-15 text-floresta inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
            >
              Histórico
            </Link>
          ) : null}
        </div>
      </header>

      {faixaDaTrava}
      {aviso ? (
        <Aviso ok={aviso.startsWith("Recuperamos")}>{aviso}</Aviso>
      ) : null}
      {copiaVelha && editando ? (
        <div className="bg-papel rounded-interno flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-ui-17 text-tinta">
            Há um texto não salvo neste aparelho.
          </p>
          <div className="flex gap-2">
            <Botao
              variante="secundario"
              onClick={() => {
                api.current?.definir(
                  paraDocumento(copiaVelha.texto, copiaVelha.marcacoes),
                );
                setTitulo(copiaVelha.texto.titulo);
                setAno(copiaVelha.texto.ano?.toString() ?? "");
                setCopiaVelha(null);
                mudou();
              }}
            >
              Recuperar
            </Botao>
            <Botao
              variante="texto"
              onClick={() => {
                gravarCopia(historia.id, null);
                setCopiaVelha(null);
              }}
            >
              Descartar
            </Botao>
          </div>
        </div>
      ) : null}

      {/* Abas só no celular e no tablet; no computador, as duas colunas. */}
      <div
        role="tablist"
        aria-label="Partes da história"
        className="bg-polen-2 flex gap-1 self-start rounded-full p-1 lg:hidden"
      >
        {(["texto", "audio"] as const).map((p) => (
          <button
            key={p}
            role="tab"
            type="button"
            aria-selected={painel === p}
            aria-controls={`painel-${p}`}
            onClick={() => setPainel(p)}
            className={
              "text-ui-17 min-h-11 rounded-full px-5 transition-colors duration-[var(--dur-rapida)] " +
              (painel === p
                ? "bg-papel text-tinta font-medium"
                : "text-tinta-2")
            }
          >
            {p === "texto" ? "Texto" : "Áudio"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <section
          id="painel-audio"
          aria-label="Áudio e transcrição"
          className={
            (painel === "audio" ? "" : "hidden ") +
            "lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-2"
          }
        >
          {audioDaHistoria}
        </section>
        <section
          id="painel-texto"
          aria-label="Texto"
          className={(painel === "texto" ? "" : "hidden ") + "lg:block"}
        >
          {textoDaHistoria}
        </section>
      </div>

      {/* Player: sempre à mão, no rodapé. */}
      <audio
        ref={elementoDoAudio}
        preload="none"
        onTimeUpdate={aoAtualizar}
        onPlay={aoTocar}
        onPause={aoPausar}
        onEnded={aoPausar}
        className="hidden"
      />
      {temAudio ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-6xl justify-center px-5 pb-[max(1rem,env(safe-area-inset-bottom))] lg:justify-start lg:px-8">
          <div className="bg-tinta text-papel shadow-flutuante pointer-events-auto flex min-h-14 w-full max-w-md items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 lg:max-w-[calc((100%-4rem)*5/12)]">
            <button
              type="button"
              onClick={alternar}
              aria-label={tocando ? "Pausar" : "Ouvir a gravação"}
              className="bg-papel text-tinta inline-flex size-11 shrink-0 items-center justify-center rounded-full"
            >
              {tocando ? (
                <IconePausa tamanho={20} />
              ) : (
                <IconeTocar tamanho={20} />
              )}
            </button>
            <p className="text-ui-15 min-w-0 flex-1 truncate">
              {atual ? (
                <>
                  <span className="font-medium">{atual.falante}</span>
                  <span className="opacity-70"> · {atual.texto}</span>
                </>
              ) : (
                "Ouvir a gravação"
              )}
            </p>
            <span className="text-ui-15 num opacity-70">{minutos(tempo)}</span>
          </div>
        </div>
      ) : null}

      <FolhaInferior
        aberta={grifo !== null}
        aoFechar={() => setGrifo(null)}
        titulo="Confira"
      >
        {grifo ? (
          <div className="flex flex-col gap-4">
            <p className="text-ui-13 text-tinta-2 font-medium tracking-wide uppercase">
              {TIPO[grifo.tipo] ?? "Confira"}
            </p>
            <p className="font-livro text-livro-20 text-tinta">
              “{grifo.trecho}”
            </p>
            <p className="text-ui-17 text-tinta-2">{grifo.motivo}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {editando ? (
                <Botao
                  onClick={() => {
                    api.current?.tirarGrifo(grifo.id);
                    setGrifo(null);
                  }}
                >
                  Está certo
                </Botao>
              ) : null}
              {temAudio ? (
                <Botao
                  variante="secundario"
                  onClick={() => {
                    const g = grifo;
                    setGrifo(null);
                    const doc = api.current?.documento();
                    const p = doc?.content.find((x) =>
                      x.content?.some((t) =>
                        t.marks?.some(
                          (m) => m.type === "confira" && m.attrs?.id === g.id,
                        ),
                      ),
                    );
                    const s = segmentoDaFrase(
                      g.trecho,
                      p?.attrs?.fontes ?? [],
                      porId,
                    );
                    if (s) tocar(s, true);
                  }}
                >
                  Ouvir o trecho
                </Botao>
              ) : null}
            </div>
            {editando ? (
              <p className="text-ui-15 text-tinta-2">
                Se não estiver, corrija no texto: o grifo sai sozinho.
              </p>
            ) : null}
          </div>
        ) : null}
      </FolhaInferior>
    </main>
  );
}
