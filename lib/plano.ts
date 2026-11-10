import type { PlanoEstado } from "@/lib/supabase/tipos";

type Plano = { plano_estado: PlanoEstado; plano_vence_em: string | null };

/** O estado que vale na tela: ativo com vencimento passado já é somente leitura. */
export function estadoEfetivo(
  plano: Plano,
  agora: Date = new Date(),
): PlanoEstado {
  if (plano.plano_estado !== "ativo") return plano.plano_estado;
  if (!plano.plano_vence_em || new Date(plano.plano_vence_em) <= agora)
    return "somente_leitura";
  return "ativo";
}

export function podeEscrever(plano: Plano, agora: Date = new Date()) {
  return estadoEfetivo(plano, agora) === "ativo";
}
