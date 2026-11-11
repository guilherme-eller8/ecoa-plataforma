// Mapa único: estado da história no banco → o que o cartão mostra (lib/ui/etapas.ts).
import type { EstadoCartao } from "@/components/ui/cartao-historia";
import { ETAPA_DO_ESTADO, type EstadoHistoria } from "@/lib/pipeline/regras";

export function estadoDoCartao(
  estado: EstadoHistoria,
  revisada = false,
): EstadoCartao {
  // "pronta" no cartão = já revisada (prompt 8). A IA entrega "Pronta para revisar".
  if (estado === "pronta" && revisada) return "pronta";
  return ETAPA_DO_ESTADO[estado];
}
