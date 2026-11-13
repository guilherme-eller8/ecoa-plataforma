// Frase → trecho do áudio (prompt 8). O banco não guarda tempo por frase: cada parágrafo
// aponta para os segmentos que o sustentam (T8). A frase tocada é comparada, por palavras em
// comum, com esses segmentos, e toca o mais parecido. Sem nada parecido, o 1º do parágrafo.

export type SegmentoDaTela = {
  id: number;
  gravacao: string; // recording_id
  inicio: number; // segundos dentro da gravação
  fim: number;
  texto: string;
  falante: string; // rótulo para a tela: nome do autor, "Entrevistador"…
};

/** Frase que contém a posição `pos` do texto (início e fim em caracteres). */
export function fraseEm(texto: string, pos: number) {
  const fins = /[.!?…]+["”»)]*\s+/g;
  let inicio = 0;
  let m: RegExpExecArray | null;
  while ((m = fins.exec(texto))) {
    const fim = m.index + m[0].length;
    if (pos < fim)
      return {
        inicio,
        fim: m.index + m[0].trimEnd().length,
        texto: texto.slice(inicio, m.index + m[0].trimEnd().length),
      };
    inicio = fim;
  }
  return { inicio, fim: texto.length, texto: texto.slice(inicio) };
}

function palavras(texto: string): Set<string> {
  return new Set(
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 3),
  );
}

/** O segmento de origem que mais se parece com a frase. */
export function segmentoDaFrase(
  frase: string,
  fontes: number[],
  segmentos: Map<number, SegmentoDaTela>,
): SegmentoDaTela | null {
  const candidatos = fontes.flatMap((id) => {
    const s = segmentos.get(id);
    return s ? [s] : [];
  });
  if (!candidatos.length) return null;
  const alvo = palavras(frase);
  let melhor = candidatos[0];
  let nota = 0;
  for (const s of candidatos) {
    const p = palavras(s.texto);
    let comum = 0;
    for (const w of alvo) if (p.has(w)) comum++;
    const n = alvo.size ? comum / alvo.size : 0;
    if (n > nota) {
      nota = n;
      melhor = s;
    }
  }
  return melhor;
}

/** "3:07" */
export function minutos(s: number) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
