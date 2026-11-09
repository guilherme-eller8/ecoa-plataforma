import { describe, expect, it } from "vitest";
import { duracaoOgg } from "./duracao";

/** Página Ogg mínima: "OggS", versão, flags, granule (int64 LE) e o resto zerado. */
function pagina(granulo: bigint, corpo: number[] = []) {
  const b = new Uint8Array(27 + corpo.length);
  b.set([0x4f, 0x67, 0x67, 0x53], 0);
  new DataView(b.buffer).setBigInt64(6, granulo, true);
  b.set(corpo, 27);
  return b;
}

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

function opusHead(preSkip: number) {
  const h = new Uint8Array(19);
  h.set(ascii("OpusHead"), 0);
  h[8] = 1; // versão
  h[9] = 1; // canais
  new DataView(h.buffer).setUint16(10, preSkip, true);
  new DataView(h.buffer).setUint32(12, 48000, true);
  return [...h];
}

function vorbisHead(taxa: number) {
  const h = new Uint8Array(30);
  h.set([0x01, ...ascii("vorbis")], 0);
  new DataView(h.buffer).setUint32(12, taxa, true);
  return [...h];
}

describe("duracaoOgg", () => {
  it("Opus: granule menos o pre-skip, a 48 kHz", () => {
    const cabeca = pagina(BigInt(0), opusHead(312));
    const cauda = new Uint8Array([
      ...pagina(BigInt(1000)),
      ...pagina(BigInt(48000 * 65 + 312)),
    ]);
    expect(duracaoOgg(cabeca, cauda)).toBeCloseTo(65, 3);
  });

  it("Vorbis: granule pela taxa do cabeçalho", () => {
    const cabeca = pagina(BigInt(0), vorbisHead(44100));
    const cauda = pagina(BigInt(44100 * 30));
    expect(duracaoOgg(cabeca, cauda)).toBeCloseTo(30, 3);
  });

  it("sem página Ogg no fim, null", () => {
    expect(
      duracaoOgg(pagina(BigInt(0), opusHead(0)), new Uint8Array([1, 2, 3])),
    ).toBeNull();
  });

  it("sem cabeçalho conhecido, null", () => {
    expect(duracaoOgg(pagina(BigInt(0)), pagina(BigInt(48000)))).toBeNull();
  });
});
