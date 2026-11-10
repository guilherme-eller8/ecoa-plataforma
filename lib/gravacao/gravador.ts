// Núcleo do gravador (MediaRecorder), usado pelo causo da família (pedaços em memória) e pelo
// gravador do autor e do modo conversa (pedaços no IndexedDB). Só navegador.
// Um pedaço por segundo: os pedaços concatenados formam um arquivo válido (WebM no Chrome,
// MP4 fragmentado no Safari), então uma gravação cortada no meio continua tocável.
import { GRAVACAO_KBPS } from "@/lib/config";

export type ExtGravacao = "webm" | "m4a";

/** Opus em WebM onde houver (Chrome, Firefox, Android); AAC em MP4 no Safari. Sem ogg. */
export function tipoSuportado(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"])
    if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

export function extDoMime(mime: string): ExtGravacao {
  return mime.startsWith("audio/mp4") ? "m4a" : "webm";
}

/** Supressão de ruído desligada: corta a voz fraca de quem fala baixo. */
export function pedirMicrofone() {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: false },
  });
}

/**
 * Um MediaRecorder sobre um stream. `parar()` só resolve depois que o último pedaço foi
 * entregue a `aoPedaco` (e a promessa que ele devolve terminou).
 */
export class Gravador {
  readonly mime: string;
  private readonly r: MediaRecorder;
  private seq = 0;
  private pendente: Promise<void> = Promise.resolve();
  private fim: Promise<void>;

  constructor(
    stream: MediaStream,
    aoPedaco: (seq: number, pedaco: Blob) => Promise<void> | void,
    aoFalhar?: () => void,
  ) {
    const mimeType = tipoSuportado();
    this.r = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: GRAVACAO_KBPS * 1000,
    });
    this.mime = (this.r.mimeType || mimeType || "audio/webm").split(";")[0];
    this.r.ondataavailable = (e) => {
      if (!e.data.size) return;
      const seq = this.seq++;
      // Escritas em fila: a ordem dos pedaços é a ordem do arquivo.
      this.pendente = this.pendente.then(() => aoPedaco(seq, e.data));
    };
    this.r.onerror = () => aoFalhar?.();
    this.fim = new Promise((resolve) => {
      this.r.onstop = () => resolve();
    });
  }

  get estado() {
    return this.r.state;
  }

  iniciar() {
    this.r.start(1000);
  }

  pausar() {
    if (this.r.state === "recording") {
      this.r.requestData();
      this.r.pause();
    }
  }

  retomar() {
    if (this.r.state === "paused") this.r.resume();
  }

  /** Para e espera o último pedaço ser salvo. */
  async parar() {
    if (this.r.state !== "inactive") this.r.stop();
    await this.fim;
    await this.pendente;
  }
}
