// A sugestão que a pessoa confere (T48): o bruto do Scribe sem hesitações isoladas. Nada mais
// muda: nenhuma palavra trocada nem juntada ("não, não" e "tchau tchau" ficam).

// Hesitações sem sentido próprio. "é" (verbo), "ah", "né" e "aí" ficam: podem ter sentido.
const HESITACAO =
  /^(a+h+n+|ã+h*|h[ãa]+|hu+m+|hm+|u+h?m+|é{2,}|e{2,}h*|ã{2,}|eh+|hum+)$/i;

const so = (palavra: string) =>
  palavra.toLowerCase().replace(/[.,;:!?…"'“”()-]/g, "");

/** Junta as palavras do Scribe como vieram (o bruto guardado no banco). */
export function juntarPalavras(palavras: { texto: string }[]): string {
  return palavras
    .map((p) => p.texto.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+([.,;:!?…])/g, "$1")
    .trim();
}

/** Tira as hesitações isoladas (com a pontuação presa a elas) e acerta a maiúscula do começo. */
export function limparTranscricao(bruto: string): string {
  const saida = bruto
    .split(/\s+/)
    .filter((p) => p && !HESITACAO.test(so(p)))
    .join(" ")
    .trim();
  return saida.charAt(0).toUpperCase() + saida.slice(1);
}
