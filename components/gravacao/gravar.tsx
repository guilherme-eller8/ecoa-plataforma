"use client";

// Gravador resiliente do autor e do modo conversa (T30, P38, P39).
// Cada segundo gravado vai para o IndexedDB na hora. Só depois de "Enviar" a gravação sobe
// (TUS, retomável) e só sai do aparelho quando o servidor confirma o arquivo inteiro.
// Conversa: a cada 30 min a parte fecha e outra começa no mesmo microfone, sem parar.
import { useCallback, useEffect, useRef, useState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Gravador as Visual } from "@/components/ui/gravador";
import { formatarDuracao } from "@/lib/audios/formatos";
import { MAX_GRAVACAO_MIN } from "@/lib/config";
import {
  enviarGravacao,
  recuperar,
  type AdaptadorEnvio,
  type SubirBlob,
} from "@/lib/gravacao/envio";
import { extDoMime, Gravador, pedirMicrofone } from "@/lib/gravacao/gravador";
import {
  juntar,
  pedirPersistencia,
  type Armazem,
  type DestinoGravacao,
  type GravacaoLocal,
} from "@/lib/gravacao/local";

type Fase =
  "pronto" | "gravando" | "pausado" | "revisando" | "enviando" | "enviada";

const LIMITE_PARTE_S = MAX_GRAVACAO_MIN * 60;
const TENTAR_DE_NOVO_MS = 30_000;

const mesmoDestino = (a: DestinoGravacao, b: DestinoGravacao) =>
  a.tipo === "livro" && b.tipo === "livro"
    ? a.livroId === b.livroId
    : a.tipo === "historia" && b.tipo === "historia"
      ? a.historiaId === b.historiaId
      : a.tipo === "autor" && b.tipo === "autor" && a.token === b.token;

/** Partes da mesma conversa andam juntas. */
function agrupar(lista: GravacaoLocal[]) {
  const grupos = new Map<string, GravacaoLocal[]>();
  for (const g of lista) {
    const k = g.loteId ?? g.id;
    grupos.set(k, [...(grupos.get(k) ?? []), g]);
  }
  return [...grupos.values()].map((p) => p.sort((x, y) => x.parte - y.parte));
}

export function Gravar({
  destino,
  promptId,
  emPartes,
  armazem,
  adaptador,
  subir,
  depois,
  tamanho = "padrao",
  limiteParteS = LIMITE_PARTE_S,
}: {
  destino: DestinoGravacao;
  promptId: string | null;
  emPartes: boolean; // conversa: sem teto; autor: para aos 30 min
  armazem: Armazem;
  adaptador: AdaptadorEnvio;
  subir: SubirBlob;
  depois: React.ReactNode; // o que mostrar quando a gravação chegou
  tamanho?: "padrao" | "autor";
  limiteParteS?: number; // só o styleguide e o e2e mudam (para testar a troca de parte)
}) {
  const [fase, setFase] = useState<Fase>("pronto");
  const [segundos, setSegundos] = useState(0);
  const [partes, setPartes] = useState<GravacaoLocal[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [progresso, setProgresso] = useState(0);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(
    null,
  );
  const [pendentes, setPendentes] = useState<GravacaoLocal[][]>([]);

  const stream = useRef<MediaStream | null>(null);
  const gravador = useRef<Gravador | null>(null);
  const parte = useRef<GravacaoLocal | null>(null);
  const lote = useRef<string | null>(null);
  const relogio = useRef<number | null>(null);
  const total = useRef(0);
  const naParte = useRef(0);
  const trava = useRef<WakeLockSentinel | null>(null);
  const enviandoAgora = useRef(false);
  const daSessao = useRef<Set<string>>(new Set()); // partes desta tela: não são "perdidas"
  const faseAtual = useRef<Fase>("pronto");
  faseAtual.current = fase;

  const doDestino = useCallback(
    async () =>
      (await armazem.listar()).filter((g) => mesmoDestino(g.destino, destino)),
    [armazem, destino],
  );

  // ── Envio (também o que ficou de antes) ────────────────────────────────
  const enviarGrupo = useCallback(
    async (grupo: GravacaoLocal[]) => {
      let tudo = true;
      for (const [i, g] of grupo.entries()) {
        const r = await enviarGravacao(g.id, {
          armazem,
          adaptador,
          subir,
          aoProgresso: (f) => setProgresso((i + f) / grupo.length),
        });
        if (r.fim === "parada") {
          setAviso({
            ok: false,
            texto: "Este link foi trocado. Sua gravação está guardada aqui.",
          });
          return false;
        }
        if (r.fim === "falhou") tudo = false;
      }
      if (!tudo)
        setAviso({
          ok: false,
          texto:
            "Sem internet agora. Sua gravação está guardada e sobe sozinha.",
        });
      return tudo;
    },
    [armazem, adaptador, subir],
  );

  const retomarEnvios = useCallback(async () => {
    if (enviandoAgora.current) return;
    enviandoAgora.current = true;
    try {
      const lista = await doDestino();
      for (const grupo of agrupar(lista.filter((g) => g.estado === "enviando")))
        await enviarGrupo(grupo);
      const restantes = await doDestino();
      setPendentes(
        agrupar(
          restantes.filter(
            (g) =>
              (g.estado === "pronta" || g.estado === "parada") &&
              !daSessao.current.has(g.id),
          ),
        ),
      );
      if (
        faseAtual.current === "enviando" &&
        !restantes.some((g) => g.estado === "enviando")
      ) {
        setAviso(null);
        setFase("enviada");
      }
    } finally {
      enviandoAgora.current = false;
    }
  }, [doDestino, enviarGrupo]);

  // Ao abrir: o que morreu no meio vira "pronta" (aparece com Enviar); o que já estava
  // subindo continua sozinho. De novo quando a internet volta e a cada 30 s.
  useEffect(() => {
    let vivo = true;
    void recuperar(armazem).then(() => {
      if (vivo) void retomarEnvios();
    });
    const aoVoltar = () => void retomarEnvios();
    window.addEventListener("online", aoVoltar);
    const t = window.setInterval(aoVoltar, TENTAR_DE_NOVO_MS);
    return () => {
      vivo = false;
      window.removeEventListener("online", aoVoltar);
      window.clearInterval(t);
    };
  }, [armazem, retomarEnvios]);

  // ── Gravação ───────────────────────────────────────────────────────────
  async function prenderTela() {
    try {
      trava.current = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      trava.current = null;
    }
  }

  function soltarTela() {
    void trava.current?.release().catch(() => {});
    trava.current = null;
  }

  function contar(ligado: boolean) {
    if (relogio.current) window.clearInterval(relogio.current);
    relogio.current = null;
    if (!ligado) return;
    relogio.current = window.setInterval(() => {
      total.current += 1;
      naParte.current += 1;
      setSegundos(total.current);
      const p = parte.current;
      if (p && naParte.current % 5 === 0) {
        p.segundos = naParte.current;
        void armazem.salvar(p).catch(() => {});
      }
      if (naParte.current >= limiteParteS) {
        if (emPartes) void trocarParte();
        else void concluir();
      }
    }, 1000);
  }

  async function falhaDeEscrita() {
    setAviso({
      ok: false,
      texto: "Sem espaço no celular. O que foi gravado até aqui está guardado.",
    });
    await concluir();
  }

  async function novaParte(numero: number) {
    const s = stream.current!;
    const id = crypto.randomUUID();
    daSessao.current.add(id);
    const g = new Gravador(
      s,
      (seq, pedaco) =>
        armazem
          .adicionarPedaco(id, seq, pedaco)
          .catch(() => void falhaDeEscrita()),
      () => void concluir(),
    );
    const registro: GravacaoLocal = {
      id,
      idServidor: id,
      destino,
      promptId,
      loteId: lote.current,
      parte: numero,
      mime: g.mime,
      ext: extDoMime(g.mime),
      segundos: 0,
      estado: "gravando",
      preparado: null,
      criadaEm: Date.now(),
    };
    await armazem.salvar(registro);
    g.iniciar();
    return { g, registro };
  }

  async function fecharParte(g: Gravador, registro: GravacaoLocal, s: number) {
    await g.parar();
    registro.segundos = Math.max(1, s);
    registro.estado = "pronta";
    await armazem.salvar(registro).catch(() => {});
    setPartes((l) => [
      ...l.filter((x) => x.id !== registro.id),
      { ...registro },
    ]);
  }

  async function trocarParte() {
    const velho = gravador.current;
    const velhoRegistro = parte.current;
    const s = naParte.current;
    if (!velho || !velhoRegistro) return;
    // Começa a nova antes de fechar a velha: nenhum segundo fica de fora.
    const { g, registro } = await novaParte(velhoRegistro.parte + 1);
    gravador.current = g;
    parte.current = registro;
    naParte.current = 0;
    await fecharParte(velho, velhoRegistro, s);
  }

  async function comecar() {
    setAviso(null);
    try {
      void pedirPersistencia();
      const s = await pedirMicrofone();
      stream.current = s;
      // Ligação ou fone desconectado: termina com o que tem.
      s.getAudioTracks().forEach((t) => (t.onended = () => void concluir()));
      lote.current = emPartes ? crypto.randomUUID() : null;
      total.current = 0;
      naParte.current = 0;
      setSegundos(0);
      setPartes([]);
      const { g, registro } = await novaParte(1);
      gravador.current = g;
      parte.current = registro;
      navigator.vibrate?.(40);
      await prenderTela();
      setFase("gravando");
      contar(true);
    } catch {
      stream.current?.getTracks().forEach((t) => t.stop());
      setAviso({
        ok: false,
        texto:
          "Não conseguimos usar o microfone. Libere o acesso e tente de novo.",
      });
    }
  }

  function pausar() {
    gravador.current?.pausar();
    contar(false);
    const p = parte.current;
    if (p) {
      p.segundos = naParte.current;
      void armazem.salvar(p).catch(() => {});
    }
    setFase("pausado");
  }

  function retomar() {
    gravador.current?.retomar();
    contar(true);
    void prenderTela();
    setFase("gravando");
  }

  async function concluir() {
    const g = gravador.current;
    const p = parte.current;
    if (!g || !p) return;
    gravador.current = null;
    parte.current = null;
    contar(false);
    await fecharParte(g, p, naParte.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    soltarTela();
    setFase("revisando");
  }

  // Página escondida (trocou de app, tela apagou): pausa e salva; ao voltar, prende a tela.
  useEffect(() => {
    const aoMudar = () => {
      if (document.hidden && faseAtual.current === "gravando") pausar();
      if (!document.hidden && faseAtual.current === "gravando")
        void prenderTela();
    };
    const aoSair = (e: BeforeUnloadEvent) => {
      if (faseAtual.current === "gravando" || faseAtual.current === "pausado")
        e.preventDefault();
    };
    document.addEventListener("visibilitychange", aoMudar);
    window.addEventListener("beforeunload", aoSair);
    return () => {
      document.removeEventListener("visibilitychange", aoMudar);
      window.removeEventListener("beforeunload", aoSair);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Players das partes na revisão.
  useEffect(() => {
    if (fase !== "revisando") return;
    let vivo = true;
    const criadas: string[] = [];
    void Promise.all(partes.map((p) => juntar(armazem, p))).then((blobs) => {
      if (!vivo) return;
      for (const b of blobs) criadas.push(URL.createObjectURL(b));
      setUrls(criadas);
    });
    return () => {
      vivo = false;
      criadas.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [fase, partes, armazem]);

  async function regravar() {
    if (!window.confirm("Apagar esta gravação?")) return;
    for (const p of partes) await armazem.apagar(p.id);
    setPartes([]);
    setSegundos(0);
    setFase("pronto");
  }

  async function enviar(grupo: GravacaoLocal[]) {
    setFase("enviando");
    setProgresso(0);
    setAviso(null);
    // Prompt 7: toda parte guarda quantas partes a conversa tem, antes de a 1ª subir. Depois de
    // reiniciar, as partes que já subiram não estão mais aqui para contar.
    for (const g of grupo) {
      const atual = await armazem.ler(g.id);
      if (atual && (atual.estado !== "enviando" || !atual.totalPartes)) {
        atual.estado = "enviando";
        atual.totalPartes = atual.totalPartes ?? grupo.length;
        g.totalPartes = atual.totalPartes;
        await armazem.salvar(atual);
      }
    }
    setPendentes((l) => l.filter((x) => x[0]?.id !== grupo[0]?.id));
    enviandoAgora.current = true;
    try {
      if (await enviarGrupo(grupo)) setFase("enviada");
    } finally {
      enviandoAgora.current = false;
    }
  }

  async function salvarNoCelular(grupo: GravacaoLocal[]) {
    for (const g of grupo) {
      const blob = await juntar(armazem, g);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `gravacao-${g.parte}.${g.ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }

  // ── Tela ───────────────────────────────────────────────────────────────
  const textoGrande = tamanho === "autor" ? "text-ui-20" : "text-ui-17";
  const totalPartes = partes.reduce((s, p) => s + p.segundos, 0);

  return (
    <div className="flex flex-col gap-6">
      {pendentes.map((grupo) => {
        const s = grupo.reduce((t, g) => t + g.segundos, 0);
        const parada = grupo.some((g) => g.estado === "parada");
        return (
          <div
            key={grupo[0].id}
            className="rounded-cartao border-linha bg-papel flex flex-col gap-3 border p-5"
          >
            <p className={`${textoGrande} text-tinta`}>
              {parada
                ? "Este link foi trocado. Sua gravação está guardada aqui."
                : `Achamos uma gravação${formatarDuracao(s) ? ` de ${formatarDuracao(s)}` : ""} que não foi enviada.`}
            </p>
            {parada ? (
              <Botao
                variante="secundario"
                tamanho={tamanho}
                onClick={() => void salvarNoCelular(grupo)}
              >
                Salvar no celular
              </Botao>
            ) : (
              <Botao
                tamanho={tamanho}
                onClick={() => void enviar(grupo)}
                disabled={fase === "gravando" || fase === "pausado"}
              >
                Enviar
              </Botao>
            )}
          </div>
        );
      })}

      {fase === "pronto" || fase === "gravando" || fase === "pausado" ? (
        <div className="flex flex-col items-center gap-3">
          <Visual
            estado={fase}
            segundos={segundos}
            aoTocar={
              fase === "pronto"
                ? () => void comecar()
                : fase === "gravando"
                  ? pausar
                  : retomar
            }
            aoConcluir={fase === "pronto" ? undefined : () => void concluir()}
          />
          {!emPartes && fase !== "pronto" && segundos >= limiteParteS - 60 ? (
            <p className={`${textoGrande} text-tinta-2`}>Falta 1 minuto.</p>
          ) : null}
        </div>
      ) : null}

      {fase === "revisando" ? (
        <div className="flex flex-col gap-4">
          <p className={`${textoGrande} text-tinta`}>
            {formatarDuracao(totalPartes) ?? "Gravação"} gravados
          </p>
          {urls.map((u, i) => (
            <div key={u} className="flex flex-col gap-1">
              {urls.length > 1 ? (
                <p className="text-ui-15 text-tinta-2">
                  Parte {i + 1} de {urls.length}
                </p>
              ) : null}
              <audio controls src={u} className="w-full" />
            </div>
          ))}
          <Botao
            tamanho={tamanho}
            larguraTotal
            onClick={() => void enviar(partes)}
          >
            Enviar
          </Botao>
          <Botao
            variante="texto"
            tamanho={tamanho}
            className="self-center"
            onClick={() => void regravar()}
          >
            Gravar de novo
          </Botao>
        </div>
      ) : null}

      {fase === "enviando" ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className={`${textoGrande} text-tinta`}>Guardando sua gravação…</p>
          <div className="bg-polen-2 h-2 overflow-hidden rounded-full">
            <div
              className="bg-floresta h-full transition-[width] duration-300"
              style={{ width: `${Math.round(progresso * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {fase === "enviada" ? (
        <div className="flex flex-col gap-4" role="status">
          <p className="font-livro text-livro-28 text-tinta leading-tight">
            Pronto. A gravação chegou.
          </p>
          {depois}
        </div>
      ) : null}

      {aviso ? <Aviso ok={aviso.ok}>{aviso.texto}</Aviso> : null}
    </div>
  );
}
