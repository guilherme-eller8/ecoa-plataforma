// Páginas estimadas do livro (Q13): palavras de todas as histórias com texto ÷ 220 (A5), para
// cima. A mesma conta de privado.palavras_do_texto + servico_resumo_semanal (teste de paridade).
import { PALAVRAS_POR_PAGINA_ESTIMADA } from "@/lib/config";

type Texto = { paragrafos?: { texto?: string | null }[] } | null | undefined;

export function palavrasDoTexto(texto: Texto): number {
  return (texto?.paragrafos ?? []).reduce(
    (total, p) =>
      total + (p.texto ?? "").trim().split(/\s+/).filter(Boolean).length,
    0,
  );
}

export function paginasEstimadas(textos: Texto[]): number {
  const palavras = textos.reduce((t, x) => t + palavrasDoTexto(x), 0);
  return Math.ceil(palavras / PALAVRAS_POR_PAGINA_ESTIMADA);
}
