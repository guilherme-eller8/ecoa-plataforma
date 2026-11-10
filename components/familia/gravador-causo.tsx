"use client";

// Gravador simples do causo: gravar, pausar, concluir, ouvir e regravar, até 3 minutos.
// Compõe o visual do design system (components/ui/gravador). A resiliência (cache no
// aparelho, upload em partes) é do gravador do autor, no prompt 5.
import { useEffect, useRef, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { Gravador, type EstadoGravador } from "@/components/ui/gravador";
import { CAUSO_AUDIO_KBPS, MAX_CAUSO_AUDIO_MIN } from "@/lib/config";
import { falarDuracao } from "@/lib/ui/tempo";

export type AudioGravado = { blob: Blob; mime: string; segundos: number };

const LIMITE_S = MAX_CAUSO_AUDIO_MIN * 60;

function tipoSuportado() {
  for (const t of [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ])
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(t)
    )
      return t;
  return "";
}

export function GravadorCauso({
  aoMudar,
}: {
  aoMudar: (a: AudioGravado | null) => void;
}) {
  const [estado, setEstado] = useState<EstadoGravador>("pronto");
  const [segundos, setSegundos] = useState(0);
  const [audio, setAudio] = useState<{ url: string; segundos: number } | null>(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const relogio = useRef<number | null>(null);
  const tempo = useRef(0);

  useEffect(
    () => () => {
      if (relogio.current) window.clearInterval(relogio.current);
      gravador.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  function contar(ligado: boolean) {
    if (relogio.current) window.clearInterval(relogio.current);
    relogio.current = null;
    if (!ligado) return;
    relogio.current = window.setInterval(() => {
      tempo.current += 1;
      setSegundos(tempo.current);
      if (tempo.current >= LIMITE_S) concluir();
    }, 1000);
  }

  async function comecar() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = tipoSuportado();
      const r = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: CAUSO_AUDIO_KBPS * 1000,
      });
      pedacos.current = [];
      r.ondataavailable = (e) => e.data.size && pedacos.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = r.mimeType || mimeType || "audio/webm";
        const blob = new Blob(pedacos.current, { type: mime });
        setAudio({ url: URL.createObjectURL(blob), segundos: tempo.current });
        aoMudar({ blob, mime, segundos: tempo.current });
      };
      gravador.current = r;
      tempo.current = 0;
      setSegundos(0);
      r.start(1000);
      navigator.vibrate?.(40);
      setEstado("gravando");
      contar(true);
    } catch {
      setErro(
        "Não conseguimos usar o microfone. Libere o acesso ou escreva o causo.",
      );
    }
  }

  function tocar() {
    const r = gravador.current;
    if (estado === "pronto") return void comecar();
    if (!r) return;
    if (estado === "gravando") {
      r.pause();
      contar(false);
      setEstado("pausado");
    } else {
      r.resume();
      contar(true);
      setEstado("gravando");
    }
  }

  function concluir() {
    contar(false);
    if (gravador.current && gravador.current.state !== "inactive")
      gravador.current.stop();
    setEstado("pronto");
  }

  function regravar() {
    if (audio) URL.revokeObjectURL(audio.url);
    setAudio(null);
    setSegundos(0);
    aoMudar(null);
  }

  if (audio)
    return (
      <div className="flex flex-col gap-3">
        <audio controls src={audio.url} className="w-full" />
        <p className="text-ui-15 text-tinta-2">
          {falarDuracao(audio.segundos)} gravados
        </p>
        <Botao variante="texto" className="self-start" onClick={regravar}>
          Gravar de novo
        </Botao>
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-3">
      <Gravador
        estado={estado}
        segundos={segundos}
        aoTocar={tocar}
        aoConcluir={estado === "pronto" ? undefined : concluir}
      />
      <p className="text-ui-15 text-tinta-2">
        Até {MAX_CAUSO_AUDIO_MIN} minutos
      </p>
      {erro ? (
        <p role="alert" className="text-ui-15 text-erro text-center">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
