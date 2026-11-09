import type { PasseEstado } from "@/lib/supabase/tipos";

type Passe = { passe_estado: PasseEstado; passe_vence_em: string | null };

/** O estado que vale na tela: ativo com vencimento passado já é somente leitura. */
export function estadoEfetivo(
  passe: Passe,
  agora: Date = new Date(),
): PasseEstado {
  if (passe.passe_estado !== "ativo") return passe.passe_estado;
  if (!passe.passe_vence_em || new Date(passe.passe_vence_em) <= agora)
    return "somente_leitura";
  return "ativo";
}

export function podeEscrever(passe: Passe, agora: Date = new Date()) {
  return estadoEfetivo(passe, agora) === "ativo";
}
