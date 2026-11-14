// O tipo de um arquivo pelos primeiros bytes, não pelo que o navegador declarou (T48). O banco
// e o bucket só aceitam estes quatro.

export type TipoPorBytes = "webm" | "ogg" | "m4a" | "jpg";

const comeca = (b: Uint8Array, sinal: number[], em = 0) =>
  b.length >= em + sinal.length && sinal.every((x, i) => b[em + i] === x);

export function tipoPelosBytes(b: Uint8Array): TipoPorBytes | null {
  if (comeca(b, [0x1a, 0x45, 0xdf, 0xa3])) return "webm"; // EBML (WebM/Matroska)
  if (comeca(b, [0x4f, 0x67, 0x67, 0x53])) return "ogg"; // "OggS"
  if (comeca(b, [0x66, 0x74, 0x79, 0x70], 4)) return "m4a"; // "ftyp" no byte 4 (MP4/M4A)
  if (comeca(b, [0xff, 0xd8, 0xff])) return "jpg"; // JPEG
  return null;
}
