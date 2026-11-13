// Andamento previsto de uma história em processamento (cartão sem ansiedade): uma barra que
// enche pelo tempo esperado e para em 95% até ficar pronta, e uma frase curta.
import {
  PREVISAO_ESCREVER_BASE_S,
  PREVISAO_ESCREVER_POR_S,
  PREVISAO_OUVIR_BASE_S,
  PREVISAO_OUVIR_POR_S,
} from "@/lib/config";

export type Andamento = { fracao: number; frase: string };

const TETO = 0.95;

export function tempoPrevisto(duracaoS: number | null) {
  const d = duracaoS ?? 300;
  const ouvir = PREVISAO_OUVIR_BASE_S + d * PREVISAO_OUVIR_POR_S;
  const escrever = PREVISAO_ESCREVER_BASE_S + d * PREVISAO_ESCREVER_POR_S;
  return { ouvir, escrever, total: ouvir + escrever };
}

function falta(s: number): string {
  if (s <= 20) return "quase pronta";
  if (s < 90) return "falta menos de 2 min";
  return `falta cerca de ${Math.round(s / 60)} min`;
}

export function andamento(
  estado: "ouvindo" | "escrevendo",
  duracaoS: number | null,
  decorridoS: number,
): Andamento {
  const p = tempoPrevisto(duracaoS);
  const d = Math.max(0, decorridoS);
  // Ouvindo nunca passa da fatia de ouvir; escrevendo começa pelo menos no fim dela.
  const bruto =
    estado === "ouvindo" ? Math.min(d, p.ouvir * 0.98) : Math.max(d, p.ouvir);
  const fracao = Math.min(TETO, bruto / p.total);
  const etapa = estado === "ouvindo" ? "Ouvindo o áudio" : "Escrevendo o texto";
  return { fracao, frase: `${etapa} · ${falta(p.total - bruto)}` };
}
