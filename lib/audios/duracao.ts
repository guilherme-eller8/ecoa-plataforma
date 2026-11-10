// Duração de um arquivo de áudio, lida no aparelho antes de subir.
// Ogg (o .opus do WhatsApp): pela última página do arquivo, sem tocar nada. Funciona até no
// Safari que não toca Opus. Outros formatos: pelo <audio>. Falhou? null: a duração sai depois,
// no processamento (prompt 6).

const OGGS = [0x4f, 0x67, 0x67, 0x53]; // "OggS"

function procura(bytes: Uint8Array, padrao: number[], doFim = false) {
  const ultimo = bytes.length - padrao.length;
  const iguais = (i: number) => padrao.every((b, k) => bytes[i + k] === b);
  if (doFim) {
    for (let i = ultimo; i >= 0; i--) if (iguais(i)) return i;
  } else {
    for (let i = 0; i <= ultimo; i++) if (iguais(i)) return i;
  }
  return -1;
}

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/**
 * Duração em segundos de um Ogg (Opus ou Vorbis) a partir do começo e do fim do arquivo.
 * `cabeca` precisa conter o cabeçalho do codec; `cauda`, a última página.
 */
export function duracaoOgg(
  cabeca: Uint8Array,
  cauda: Uint8Array,
): number | null {
  const fim = procura(cauda, OGGS, true);
  if (fim < 0 || fim + 14 > cauda.length) return null;
  const visao = new DataView(cauda.buffer, cauda.byteOffset + fim + 6, 8);
  const granulo = Number(visao.getBigInt64(0, true));
  if (!Number.isFinite(granulo) || granulo <= 0) return null;

  const cab = new DataView(cabeca.buffer, cabeca.byteOffset, cabeca.byteLength);
  const opus = procura(cabeca, ascii("OpusHead"));
  if (opus >= 0 && opus + 12 <= cabeca.length) {
    const preSkip = cab.getUint16(opus + 10, true);
    const s = (granulo - preSkip) / 48000;
    return s > 0 ? s : null;
  }
  const vorbis = procura(cabeca, [0x01, ...ascii("vorbis")]);
  if (vorbis >= 0 && vorbis + 16 <= cabeca.length) {
    const taxa = cab.getUint32(vorbis + 12, true);
    return taxa > 0 ? granulo / taxa : null;
  }
  return null;
}

async function bytes(arquivo: Blob) {
  return new Uint8Array(await arquivo.arrayBuffer());
}

function pelaTagAudio(arquivo: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const audio = document.createElement("audio");
    const acabar = (v: number | null) => {
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
      resolve(v);
    };
    const tempo = setTimeout(() => acabar(null), 8000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      clearTimeout(tempo);
      const d = audio.duration;
      acabar(Number.isFinite(d) && d > 0 ? d : null);
    };
    audio.onerror = () => {
      clearTimeout(tempo);
      acabar(null);
    };
    audio.src = url;
  });
}

export async function duracaoDoArquivo(arquivo: File): Promise<number | null> {
  try {
    const ext = arquivo.name.split(".").pop()?.toLowerCase();
    if (ext === "opus" || ext === "ogg") {
      const cabeca = await bytes(arquivo.slice(0, 4096));
      const cauda = await bytes(
        arquivo.slice(Math.max(0, arquivo.size - 65536)),
      );
      const d = duracaoOgg(cabeca, cauda);
      if (d) return d;
    }
    return await pelaTagAudio(arquivo);
  } catch {
    return null;
  }
}
