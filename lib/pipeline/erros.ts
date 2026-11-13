// Erros do pipeline com código fixo (T36). A mensagem de um erro vai para o Inngest e para os
// logs, fora do Brasil: nunca pode carregar texto da fala. Por isso nada de `e.message`.
import { ErroIA } from "@/lib/ai/claude";

export const CODIGOS = [
  "scribe_falhou",
  "transcricao_vazia",
  "ia_recusou",
  "ia_api",
  "json_invalido",
  "resposta_cortada",
  "sem_rascunho",
  "concluir_recusado",
  "audio_ausente",
  "parada",
  "erro_inesperado",
] as const;
export type CodigoPipeline = (typeof CODIGOS)[number];

export class ErroPipeline extends Error {
  constructor(
    readonly etapa: string,
    readonly codigo: CodigoPipeline,
  ) {
    super(`${etapa}:${codigo}`);
    this.name = "ErroPipeline";
  }
}

export function codigoDaIA(e: unknown): CodigoPipeline {
  if (!(e instanceof ErroIA)) return "erro_inesperado";
  return (
    {
      recusa: "ia_recusou",
      api: "ia_api",
      json_invalido: "json_invalido",
      cortada: "resposta_cortada",
    } as const
  )[e.codigo];
}

/** Lê etapa e código de uma mensagem de erro, só se ela tiver o formato fixo. */
export function lerErroPipeline(mensagem: string | undefined): {
  etapa: string;
  codigo: CodigoPipeline;
} {
  const m = /^([a-z_]{2,30}):([a-z_]{2,40})$/.exec(mensagem ?? "");
  if (m && (CODIGOS as readonly string[]).includes(m[2]))
    return { etapa: m[1], codigo: m[2] as CodigoPipeline };
  return { etapa: "desconhecida", codigo: "erro_inesperado" };
}

/** Log sem a mensagem do erro: só o tipo e onde aconteceu. */
export function logarSemTexto(onde: string, e: unknown) {
  const erro = e instanceof Error ? e : new Error("desconhecido");
  console.error(`[pipeline] ${onde}`, {
    tipo: erro.name,
    codigo:
      erro instanceof ErroPipeline
        ? erro.codigo
        : erro instanceof ErroIA
          ? erro.codigo
          : undefined,
    motivo: erro instanceof ErroIA ? erro.motivo : undefined,
    pilha: erro.stack?.split("\n").slice(1, 4).join(" | "),
  });
}
