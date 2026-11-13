"use client";

// Gravador simples do causo: gravar, pausar, concluir, ouvir e regravar, até 3 minutos.
// Usa o núcleo de lib/gravacao com os pedaços em memória. A resiliência (IndexedDB, envio
// retomável) é do gravador do autor e do modo conversa (components/gravacao/gravar).
import { useEffect, useRef, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { Gravador, type EstadoGravador } from "@/components/ui/gravador";
import { MAX_CAUSO_AUDIO_MIN } from "@/lib/config";
import { Gravador as Nucleo, pedirMicrofone } from "@/lib/gravacao/gravador";
import { falarDuracao } from "@/lib/ui/tempo";

export type AudioGravado = { blob: Blob; mime: string; segundos: number };

const LIMITE_S = MAX_CAUSO_AUDIO_MIN * 60;

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
  const gravador = useRef<Nucleo | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const relogio = useRef<number | null>(null);
  const tempo = useRef(0);

  useEffect(
    () => () => {
      if (relogio.current) window.clearInterval(relogio.current);
      stream.current?.getTracks().forEach((t) => t.stop());
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
      const s = await pedirMicrofone();
      stream.current = s;
      pedacos.current = [];
      const g = new Nucleo(s, (_seq, p) => {
        pedacos.current.push(p);
      });
      gravador.current = g;
      tempo.current = 0;
      setSegundos(0);
      g.iniciar();
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
    const g = gravador.current;
    if (estado === "pronto") return void comecar();
    if (!g) return;
    if (estado === "gravando") {
      g.pausar();
      contar(false);
      setEstado("pausado");
    } else {
      g.retomar();
      contar(true);
      setEstado("gravando");
    }
  }

  function concluir() {
    contar(false);
    const g = gravador.current;
    setEstado("pronto");
    if (!g) return;
    void g.parar().then(() => {
      stream.current?.getTracks().forEach((t) => t.stop());
      const blob = new Blob(pedacos.current, { type: g.mime });
      setAudio({ url: URL.createObjectURL(blob), segundos: tempo.current });
      aoMudar({ blob, mime: g.mime, segundos: tempo.current });
    });
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
