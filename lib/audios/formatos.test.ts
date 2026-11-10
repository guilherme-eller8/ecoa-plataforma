import { describe, expect, it } from "vitest";
import {
  ACEITA_AUDIO,
  audioDoLivro,
  caminhoAudio,
  formatarDuracao,
  formatarTamanho,
  formatoDoArquivo,
  MAX_AUDIO_BYTES,
  recusa,
} from "./formatos";

const LIVRO = "00000000-0000-4000-8000-000000000001";
const ID = "00000000-0000-4000-8000-000000000002";

describe("formatoDoArquivo", () => {
  it.each([
    ["PTT-20261109-WA0003.opus", "opus", "audio/ogg"],
    ["conversa.OGG", "ogg", "audio/ogg"],
    ["Gravação 12.m4a", "m4a", "audio/mp4"],
    ["musica.mp3", "mp3", "audio/mpeg"],
    ["ceia.wav", "wav", "audio/wav"],
    ["gravado.webm", "webm", "audio/webm"],
  ])("%s → %s", (nome, ext, contentType) => {
    expect(formatoDoArquivo(nome)).toEqual({ ext, contentType });
  });

  it.each(["video.mp4", "foto.jpg", "opus", "arquivo", "x.opus.exe"])(
    "recusa %s",
    (nome) => {
      expect(formatoDoArquivo(nome)).toBeNull();
    },
  );
});

describe("recusa", () => {
  it("aceita áudio dentro do limite", () => {
    expect(recusa({ name: "a.opus", size: MAX_AUDIO_BYTES })).toBeNull();
  });

  it("acima de 50 MB, com frase clara", () => {
    expect(recusa({ name: "PTT-0001.opus", size: MAX_AUDIO_BYTES + 1 })).toBe(
      "«PTT-0001.opus» passa de 50 MB e não pode subir.",
    );
  });

  it("formato que não é áudio, com frase clara", () => {
    expect(recusa({ name: "video.mp4", size: 1000 })).toBe(
      "«video.mp4» não é áudio. Use .opus, .m4a, .mp3, .ogg, .wav ou .webm.",
    );
  });

  it("arquivo vazio", () => {
    expect(recusa({ name: "a.m4a", size: 0 })).toBe("«a.m4a» está vazio.");
  });
});

describe("caminho", () => {
  it("o caminho gerado passa na regra do banco", () => {
    expect(audioDoLivro(caminhoAudio(LIVRO, ID, "opus"), LIVRO, ID)).toBe(true);
  });

  it.each([
    `livros/${LIVRO}/audios/../${ID}.opus`,
    `livros/${LIVRO}/audios/${ID}.exe`,
    `livros/${LIVRO}/acervo/${ID}.opus`,
    `livros/${ID}/audios/${ID}.opus`,
  ])("recusa %s", (c) => {
    expect(audioDoLivro(c, LIVRO, ID)).toBe(false);
  });
});

describe("formatação", () => {
  it.each([
    [48, "48 s"],
    [185, "3 min 05 s"],
    [3725, "1 h 02 min"],
    [null, null],
    [0, null],
  ])("duração %s → %s", (s, texto) => {
    expect(formatarDuracao(s)).toBe(texto);
  });

  it("tamanho", () => {
    expect(formatarTamanho(830 * 1024)).toBe("830 KB");
    expect(formatarTamanho(2.4 * 1024 * 1024)).toBe("2,4 MB");
  });

  it("o seletor aceita os formatos do WhatsApp e do gravador", () => {
    expect(ACEITA_AUDIO).toContain(".opus");
    expect(ACEITA_AUDIO).toContain(".m4a");
    expect(ACEITA_AUDIO.startsWith("audio/*")).toBe(true);
  });
});
