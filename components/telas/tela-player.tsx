"use client";

// Player público do QR (prompt 10, P57): título, ano e Ouvir. Sem nome do autor, texto ou foto.
// Quem chega aqui apontou a câmera para o livro: uma ação só, botão grande.
import { useRef, useState, type FormEvent } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { IconePausa, IconeTocar } from "@/components/ui/icones";
import { MarcaEcoa } from "@/components/ui/marca";
import { DOMINIO_QR } from "@/lib/config";
import { normalizarCodigo } from "@/lib/qr/codigo";
import type { EstadoPlayer } from "@/lib/qr/tipos";

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10 pb-10">
      <div className="flex flex-1 flex-col justify-center gap-8 py-10">
        {children}
      </div>
      <footer className="text-tinta-2 flex justify-center opacity-80">
        <MarcaEcoa />
      </footer>
    </main>
  );
}

function tempo(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`; // taste-skill-ignore: relógio
}

function Ouvir({
  titulo,
  ano,
  audioUrl,
  tocou,
}: {
  titulo: string;
  ano: number | null;
  audioUrl: string;
  tocou: () => Promise<void>;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const contou = useRef(false);
  const [tocando, setTocando] = useState(false);
  const [agora, setAgora] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [falhou, setFalhou] = useState(false);

  function alternar() {
    const a = audio.current;
    if (!a) return;
    if (!a.paused) return a.pause();
    setFalhou(false);
    void a.play().catch(() => setFalhou(true));
    if (!contou.current) {
      contou.current = true;
      void tocou().catch(() => undefined);
    }
  }

  const progresso = duracao > 0 ? Math.min(1, agora / duracao) : 0;

  return (
    <Moldura>
      <div className="flex flex-col gap-3 text-center">
        {ano ? (
          <p className="font-ui text-ui-15 text-tinta-2 tracking-[0.12em]">
            {ano}
          </p>
        ) : null}
        <h1 className="font-livro text-livro-36 text-tinta text-balance">
          {titulo}
        </h1>
      </div>

      <div className="flex flex-col items-center gap-6">
        <button
          type="button"
          onClick={alternar}
          aria-label={tocando ? "Pausar" : "Ouvir"}
          className="bg-floresta text-papel hover:bg-floresta-escuro focus-visible:ring-floresta flex size-28 items-center justify-center rounded-full transition-transform duration-[var(--dur-rapida)] focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none active:scale-[0.97]"
        >
          {tocando ? (
            <IconePausa tamanho={44} />
          ) : (
            <IconeTocar tamanho={44} className="translate-x-0.5" />
          )}
        </button>
        <p className="font-ui text-ui-20 text-tinta font-medium">
          {tocando ? "Pausar" : agora > 0 ? "Continuar" : "Ouvir"}
        </p>
        <div className="flex w-full flex-col gap-2">
          <div
            className="bg-polen-2 h-1.5 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-label="Andamento"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progresso * 100)}
          >
            <div
              className="bg-floresta h-full rounded-full"
              style={{ width: `${progresso * 100}%` }}
            />
          </div>
          {duracao > 0 ? (
            <div className="font-ui text-ui-13 text-tinta-2 flex justify-between tabular-nums">
              <span>{tempo(agora)}</span>
              <span>{duracao ? tempo(duracao) : ""}</span>
            </div>
          ) : null}
        </div>
        {falhou ? (
          <p className="font-ui text-ui-15 text-erro text-center">
            Não deu para tocar agora. Toque de novo.
          </p>
        ) : null}
      </div>

      <audio
        ref={audio}
        src={audioUrl}
        preload="metadata"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => setTocando(false)}
        onTimeUpdate={(e) => setAgora(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuracao(e.currentTarget.duration)}
        onError={() => setFalhou(true)}
      />
    </Moldura>
  );
}

/** Para onde ir com um código: no host ouvir. é /{código}; nas prévias, /ouvir/{código}. */
function destino(codigo: string) {
  return window.location.host === DOMINIO_QR
    ? `/${codigo}`
    : `/ouvir/${codigo}`;
}

const ERROS_DO_CODIGO = {
  vazio: "Digite as 8 letras e números embaixo do QR.",
  tamanho: "O código tem 8 letras e números.",
  letra_proibida: "O código não tem 0, O, 1, I nem L. Confira a letra.",
} as const;

export function DigitarCodigo({ titulo }: { titulo: string }) {
  const [erro, setErro] = useState<string | undefined>();
  const [indo, setIndo] = useState(false);

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const entrada = String(new FormData(e.currentTarget).get("codigo") ?? "");
    const r = normalizarCodigo(entrada);
    if (!r.ok) return setErro(ERROS_DO_CODIGO[r.motivo]);
    setErro(undefined);
    setIndo(true);
    window.location.assign(destino(r.codigo));
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
      <Campo
        rotulo={titulo}
        name="codigo"
        placeholder="7KQ2 M9XA"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        maxLength={12}
        erro={erro}
        className="[&_input]:font-ui [&_input]:tracking-[0.15em] [&_input]:uppercase"
      />
      <Botao type="submit" larguraTotal carregando={indo}>
        Ouvir
      </Botao>
    </form>
  );
}

function Recado({
  titulo,
  frase,
  acao,
}: {
  titulo: string;
  frase?: string;
  acao?: "tentar" | "digitar";
}) {
  return (
    <Moldura>
      <div className="flex flex-col gap-3">
        <h1 className="font-livro text-livro-36 text-tinta text-balance">
          {titulo}
        </h1>
        {frase ? (
          <p className="font-ui text-ui-17 text-tinta-2">{frase}</p>
        ) : null}
      </div>
      {acao === "tentar" ? (
        <Botao
          variante="secundario"
          larguraTotal
          onClick={() => window.location.reload()}
        >
          Tentar de novo
        </Botao>
      ) : null}
      {acao === "digitar" ? (
        <DigitarCodigo titulo="Código embaixo do QR" />
      ) : null}
    </Moldura>
  );
}

export function TelaPlayer({
  estado,
  tocou,
}: {
  estado: EstadoPlayer;
  tocou: () => Promise<void>;
}) {
  switch (estado.estado) {
    case "ok":
      return (
        <Ouvir
          titulo={estado.titulo}
          ano={estado.ano}
          audioUrl={estado.audioUrl}
          tocou={tocou}
        />
      );
    case "preparando":
      return (
        <Recado
          titulo="A voz está sendo preparada"
          frase="Tente de novo em alguns minutos."
          acao="tentar"
        />
      );
    case "nao_encontrado":
      return (
        <Recado
          titulo="Não achamos este código"
          frase="Confira as letras embaixo do QR."
          acao="digitar"
        />
      );
    case "desativado":
      return <Recado titulo="Este áudio não está mais disponível" />;
    case "limite":
      return (
        <Recado
          titulo="Muitas tentativas agora"
          frase="Tente daqui a alguns minutos."
          acao="tentar"
        />
      );
    default:
      return <Recado titulo="Não deu certo agora" acao="tentar" />;
  }
}

/** Raiz de ouvir.: só o campo do código. */
export function TelaDigitarCodigo() {
  return (
    <Moldura>
      <h1 className="font-livro text-livro-36 text-tinta text-balance">
        Ouça a voz do livro
      </h1>
      <DigitarCodigo titulo="Digite o código embaixo do QR" />
    </Moldura>
  );
}
