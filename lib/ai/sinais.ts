// Sinais de qualidade da transcrição que não pedem rótulo de ninguém (evals, T54). Só números:
// vão para ai_usage.detalhes, que o banco recusa se tiver qualquer texto.
import { CONFIANCA_DUVIDOSA } from "@/lib/config";
import type { Palavra } from "./schemas";

export function sinaisDaTranscricao(
  palavras: Palavra[],
  duracaoS: number | null,
): Record<string, number> {
  const comConfianca = palavras.filter((p) => p.confianca != null);
  const falantes = new Set(
    palavras.flatMap((p) => (p.falante == null ? [] : [p.falante])),
  );
  const sinais: Record<string, number> = {
    palavras: palavras.length,
    com_confianca: comConfianca.length,
    duvidosas: comConfianca.filter((p) => p.confianca! < CONFIANCA_DUVIDOSA)
      .length,
    falantes: falantes.size,
  };
  if (comConfianca.length > 0) {
    const media =
      comConfianca.reduce((t, p) => t + p.confianca!, 0) / comConfianca.length;
    sinais.confianca_pct = Math.round(media * 1000) / 10;
  }
  // Quanto do áudio a transcrição cobre: pouco indica corte ou silêncio longo.
  const fim = palavras.reduce((m, p) => Math.max(m, p.fim), 0);
  if (duracaoS != null && duracaoS > 0)
    sinais.cobertura_pct = Math.min(100, Math.round((fim / duracaoS) * 100));
  return sinais;
}
