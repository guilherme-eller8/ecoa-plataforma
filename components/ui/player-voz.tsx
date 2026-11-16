"use client";

// Player único da Ecoa para toda voz que a família ouve dentro do app (gravação, causo,
// mensagem, áudio recebido). Um botão redondo, uma barra que aceita toque e arrasto, e o
// tempo só quando é conhecido: nunca "0:00 / 0:00". Tocar um pausa o que estiver tocando
// em outro player da página. O player do QR (tela-player.tsx) é o grande, de uma ação só.
import { useCallback, useEffect, useRef, useState } from "react";
import { IconePausa, IconeTocar } from "@/components/ui/icones";
import { formatarCronometro } from "@/lib/ui/tempo";

let tocandoAgora: HTMLAudioElement | null = null;

type Props = {
  src: string;
  /** Texto curto acima da barra ("Gravação de 9 nov"). Sem ele, a barra fica sozinha. */
  rotulo?: string;
  /** Nome para o leitor de tela; padrão: o rótulo ou "o áudio". */
  nome?: string;
  /** Duração conhecida pelo banco: aparece antes de carregar e quando o arquivo não informa. */
  duracaoS?: number | null;
  /** Só um pedaço da gravação (a história usa um trecho do áudio original). */
  inicioS?: number | null;
  fimS?: number | null;
  tamanho?: "padrao" | "autor";
  autoPlay?: boolean;
  preload?: "none" | "metadata";
  aoTocar?: (tocando: boolean) => void;
  mensagemDeFalha?: string;
};

export function PlayerVoz({
  src,
  rotulo,
  nome,
  duracaoS,
  inicioS,
  fimS,
  tamanho = "padrao",
  autoPlay = false,
  preload = "none",
  aoTocar,
  mensagemDeFalha = "Não deu para tocar este áudio aqui. Tente no computador.",
}: Props) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const trilho = useRef<HTMLDivElement | null>(null);
  const [tocando, setTocando] = useState(false);
  const [agora, setAgora] = useState(0);
  const [duracaoArquivo, setDuracaoArquivo] = useState<number | null>(null);
  const [comecou, setComecou] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const inicio = inicioS != null && fimS != null ? Math.max(0, inicioS) : 0;
  const fim =
    inicioS != null && fimS != null && fimS > inicio
      ? fimS
      : (duracaoArquivo ?? (duracaoS != null ? duracaoS : null));
  const total = fim != null ? Math.max(0, fim - inicio) : null;
  const decorrido = Math.max(0, agora - inicio);
  const progresso = total ? Math.min(1, decorrido / total) : 0;

  const aviso = useCallback(
    (v: boolean) => {
      setTocando(v);
      aoTocar?.(v);
    },
    [aoTocar],
  );

  useEffect(
    () => () => {
      if (tocandoAgora === audio.current) tocandoAgora = null;
    },
    [],
  );

  function tocar() {
    const a = audio.current;
    if (!a) return;
    setFalhou(false);
    const limite = fim ?? Infinity;
    if (a.currentTime < inicio || a.currentTime >= limite - 0.05)
      a.currentTime = inicio;
    void a.play().catch(() => {
      setFalhou(true);
      aviso(false);
    });
  }

  function alternar() {
    const a = audio.current;
    if (!a) return;
    if (!a.paused) return a.pause();
    tocar();
  }

  function irPara(fracao: number) {
    const a = audio.current;
    if (!a || total == null) return;
    const t = inicio + Math.min(1, Math.max(0, fracao)) * total;
    a.currentTime = t;
    setAgora(t);
    setComecou(true);
  }

  function fracaoDoPonteiro(clientX: number) {
    const r = trilho.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    return (clientX - r.left) / r.width;
  }

  const autor = tamanho === "autor";
  const botao = autor ? "size-16" : "size-12";
  const icone = autor ? 28 : 22;
  const texto = autor ? "text-ui-17" : "text-ui-13";
  const mostrarTempo = comecou || total != null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={alternar}
          aria-label={
            tocando
              ? `Pausar ${nome ?? rotulo ?? "o áudio"}`
              : `Ouvir ${nome ?? rotulo ?? "o áudio"}`
          }
          className={`${botao} bg-floresta text-papel hover:bg-floresta-escuro focus-visible:ring-floresta flex shrink-0 items-center justify-center rounded-full transition-transform duration-[var(--dur-rapida)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.96]`}
        >
          {tocando ? (
            <IconePausa tamanho={icone} />
          ) : (
            <IconeTocar tamanho={icone} className="translate-x-px" />
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {rotulo ? (
            <p
              className={`${autor ? "text-ui-20" : "text-ui-15"} text-tinta truncate`}
            >
              {rotulo}
            </p>
          ) : null}
          <div
            ref={trilho}
            role="slider"
            tabIndex={total != null ? 0 : -1}
            aria-label="Posição no áudio"
            aria-valuemin={0}
            aria-valuemax={Math.round(total ?? 0)}
            aria-valuenow={Math.round(decorrido)}
            aria-valuetext={
              total != null
                ? `${formatarCronometro(decorrido)} de ${formatarCronometro(total)}`
                : formatarCronometro(decorrido)
            }
            onPointerDown={(e) => {
              if (total == null) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              irPara(fracaoDoPonteiro(e.clientX));
            }}
            onPointerMove={(e) => {
              if (total == null) return;
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                irPara(fracaoDoPonteiro(e.clientX));
            }}
            onKeyDown={(e) => {
              if (total == null || !total) return;
              const passo = 5 / total;
              if (e.key === "ArrowRight") irPara(progresso + passo);
              else if (e.key === "ArrowLeft") irPara(progresso - passo);
              else return;
              e.preventDefault();
            }}
            className="group focus-visible:ring-floresta relative flex h-6 cursor-pointer touch-none items-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
          >
            <div className="bg-polen-2 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-floresta h-full rounded-full"
                style={{ width: `${progresso * 100}%` }}
              />
            </div>
            {comecou && total != null ? (
              <span
                aria-hidden="true"
                className="bg-floresta ring-papel absolute size-3.5 -translate-x-1/2 rounded-full ring-2"
                style={{ left: `${progresso * 100}%` }}
              />
            ) : null}
          </div>
          {mostrarTempo ? (
            <div
              className={`font-ui ${texto} text-tinta-2 flex justify-between tabular-nums`}
            >
              <span>{comecou ? formatarCronometro(decorrido) : ""}</span>
              <span>{total != null ? formatarCronometro(total) : ""}</span>
            </div>
          ) : null}
        </div>
      </div>
      {falhou ? (
        <p className="text-ui-15 text-tinta-2" role="status">
          {mensagemDeFalha}
        </p>
      ) : null}
      <audio
        ref={audio}
        src={src}
        preload={preload}
        autoPlay={autoPlay}
        onPlay={(e) => {
          if (tocandoAgora && tocandoAgora !== e.currentTarget)
            tocandoAgora.pause();
          tocandoAgora = e.currentTarget;
          setComecou(true);
          aviso(true);
        }}
        onPause={() => aviso(false)}
        onEnded={() => aviso(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setAgora(a.currentTime);
          if (inicioS != null && fimS != null && a.currentTime >= fimS) {
            a.pause();
            setAgora(fimS);
          }
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuracaoArquivo(d);
        }}
        onError={() => {
          setFalhou(true);
          aviso(false);
        }}
      />
    </div>
  );
}
