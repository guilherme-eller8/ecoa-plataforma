"use client";

// Um <audio> só para a história inteira (prompt 8). Tocar um segmento troca a gravação se
// precisar, pula para o começo dele e, se pedido, para no fim. O trecho tocando é o segmento
// da gravação atual que contém o tempo de agora.
import { useCallback, useMemo, useRef, useState } from "react";
import type { SegmentoDaTela } from "@/lib/editor/ouvir";

export type Player = {
  elemento: React.RefObject<HTMLAudioElement | null>;
  tocar: (s: SegmentoDaTela, pararNoFim: boolean) => void;
  alternar: () => void;
  tocando: boolean;
  atual: SegmentoDaTela | null;
  tempo: number;
  aoAtualizar: () => void;
  aoTocar: () => void;
  aoPausar: () => void;
  temAudio: boolean;
};

export function usePlayer(
  audios: { id: string; url: string | null }[],
  segmentos: SegmentoDaTela[],
): Player {
  const elemento = useRef<HTMLAudioElement | null>(null);
  const gravacao = useRef<string | null>(null);
  const fim = useRef<number | null>(null);
  const [tocando, setTocando] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [gravacaoAtual, setGravacaoAtual] = useState<string | null>(null);
  const urls = useMemo(
    () =>
      new Map(audios.flatMap((a) => (a.url ? [[a.id, a.url] as const] : []))),
    [audios],
  );

  const tocar = useCallback(
    (s: SegmentoDaTela, pararNoFim: boolean) => {
      const a = elemento.current;
      const url = urls.get(s.gravacao);
      if (!a || !url) return;
      fim.current = pararNoFim ? s.fim : null;
      const ir = () => {
        a.currentTime = Math.max(0, s.inicio - 0.15);
        void a.play().catch(() => setTocando(false));
      };
      if (gravacao.current !== s.gravacao) {
        gravacao.current = s.gravacao;
        setGravacaoAtual(s.gravacao);
        a.src = url;
        a.addEventListener("loadedmetadata", ir, { once: true });
        a.load();
      } else if (a.readyState >= 1) ir();
      else a.addEventListener("loadedmetadata", ir, { once: true });
    },
    [urls],
  );

  const alternar = useCallback(() => {
    const a = elemento.current;
    if (!a) return;
    if (!a.paused) return a.pause();
    if (!gravacao.current) {
      const primeiro = segmentos.find((s) => urls.has(s.gravacao));
      if (primeiro) tocar(primeiro, false);
      return;
    }
    fim.current = null;
    void a.play().catch(() => setTocando(false));
  }, [segmentos, tocar, urls]);

  const aoAtualizar = useCallback(() => {
    const a = elemento.current;
    if (!a) return;
    setTempo(a.currentTime);
    if (fim.current !== null && a.currentTime >= fim.current) {
      fim.current = null;
      a.pause();
    }
  }, []);

  const atual = useMemo(
    () =>
      gravacaoAtual
        ? (segmentos.find(
            (s) =>
              s.gravacao === gravacaoAtual &&
              s.inicio <= tempo &&
              tempo < s.fim,
          ) ?? null)
        : null,
    [gravacaoAtual, segmentos, tempo],
  );

  return {
    elemento,
    tocar,
    alternar,
    tocando,
    atual,
    tempo,
    aoAtualizar,
    aoTocar: () => setTocando(true),
    aoPausar: () => setTocando(false),
    temAudio: urls.size > 0,
  };
}
