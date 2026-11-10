import { describe, expect, it } from "vitest";
import {
  audioDoCauso,
  caminhoFoto,
  fotoDoLivro,
  tipoDoAudio,
} from "./arquivos";

const A = "0b6c2a8e-1111-4222-8333-444455556666";
const B = "9a8b7c6d-1111-4222-8333-444455556666";
const C = "11111111-2222-4333-8444-555566667777";

describe("caminhos de arquivo", () => {
  it("foto do livro passa; de outro livro, com ../ ou %2e não", () => {
    expect(fotoDoLivro(caminhoFoto(A), A)).toBe(true);
    expect(fotoDoLivro(caminhoFoto(B), A)).toBe(false);
    expect(
      fotoDoLivro(`livros/${A}/acervo/../../${B}/acervo/${C}.jpg`, A),
    ).toBe(false);
    expect(fotoDoLivro(`livros/${A}/acervo/%2e%2e/${C}.jpg`, A)).toBe(false);
    expect(fotoDoLivro(`livros/${A}/acervo/${C}.png`, A)).toBe(false);
  });

  it("áudio do causo só no caminho exato do causo", () => {
    expect(audioDoCauso(`livros/${A}/causos/${C}.webm`, A, C)).toBe(true);
    expect(audioDoCauso(`livros/${A}/causos/${C}.m4a`, A, C)).toBe(true);
    expect(audioDoCauso(`livros/${B}/causos/${C}.webm`, A, C)).toBe(false);
    expect(
      audioDoCauso(`livros/${A}/causos/%2e%2e/${B}/causos/${C}.webm`, A, C),
    ).toBe(false);
    expect(audioDoCauso(`livros/${A}/causos/${C}.mp3`, A, C)).toBe(false);
  });

  it("tipo do áudio ignora o codec", () => {
    expect(tipoDoAudio("audio/webm;codecs=opus")).toEqual({
      ext: "webm",
      contentType: "audio/webm",
    });
    expect(tipoDoAudio("audio/mp4")).toEqual({
      ext: "m4a",
      contentType: "audio/mp4",
    });
    expect(tipoDoAudio("audio/wav")).toBeNull();
  });
});
