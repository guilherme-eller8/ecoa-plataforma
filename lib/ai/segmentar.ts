// Palavras com tempo → segmentos com id contínuo entre arquivos.
import { MAX_PALAVRAS_SEGMENTO, PAUSA_SEGMENTO_S } from "@/lib/config";
import type { Palavra, Segmento } from "./schemas";

export type Regras = { pausaS: number; maxPalavras: number };

const PADRAO: Regras = {
  pausaS: PAUSA_SEGMENTO_S,
  maxPalavras: MAX_PALAVRAS_SEGMENTO,
};

export function segmentar(
  arquivo: string,
  palavras: Palavra[],
  primeiroId = 1,
  regras: Regras = PADRAO,
): Segmento[] {
  const segmentos: Segmento[] = [];
  let atual: Palavra[] = [];

  const fechar = () => {
    if (atual.length === 0) return;
    segmentos.push({
      id: primeiroId + segmentos.length,
      arquivo,
      inicio: atual[0].inicio,
      fim: atual[atual.length - 1].fim,
      falante: `${arquivo}:${atual[0].falante ?? "?"}`,
      texto: juntar(atual),
    });
    atual = [];
  };

  for (const p of palavras) {
    const anterior = atual[atual.length - 1];
    const quebra =
      anterior !== undefined &&
      (p.falante !== anterior.falante ||
        p.inicio - anterior.fim >= regras.pausaS ||
        atual.length >= regras.maxPalavras);
    if (quebra) fechar();
    atual.push(p);
  }
  fechar();
  return segmentos;
}

/** Junta palavras sem espaço antes de pontuação. */
function juntar(palavras: Palavra[]): string {
  return palavras
    .map((p) => p.texto.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+([,.;:!?…])/g, "$1");
}

/** Segmenta vários arquivos em ordem alfabética, com ids contínuos. */
export function segmentarTodos(
  transcricoes: { arquivo: string; palavras: Palavra[] }[],
  regras: Regras = PADRAO,
): Segmento[] {
  const ordenadas = [...transcricoes].sort((a, b) =>
    a.arquivo.localeCompare(b.arquivo),
  );
  const todos: Segmento[] = [];
  for (const t of ordenadas) {
    todos.push(...segmentar(t.arquivo, t.palavras, todos.length + 1, regras));
  }
  return todos;
}

export function contarPalavras(texto: string): number {
  return texto.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
}
