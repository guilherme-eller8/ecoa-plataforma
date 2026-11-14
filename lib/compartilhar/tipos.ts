import { z } from "zod";

// Retorno de servico_ler_compartilhada (só os parágrafos: nada de fontes, travas ou lacunas).
export const LidaCompartilhada = z.discriminatedUnion("estado", [
  z.object({ estado: z.literal("em_revisao") }),
  z.object({
    estado: z.literal("ok"),
    titulo: z.string().nullable(),
    ano: z.number().int().nullable(),
    paragrafos: z.array(z.string().nullable()),
    autor: z.string().nullable(),
    voz: z.enum(["ok", "preparando", "sem_voz"]),
    codigo: z.string().nullable(),
    pedir_audio: z.boolean(),
    audio_caminho: z.string().nullable(),
  }),
]);

/** O que a tela /o/ recebe. Link desligado e link errado são iguais (indisponivel). */
export type EstadoCompartilhada =
  | { estado: "indisponivel" }
  | { estado: "em_revisao" }
  | {
      estado: "ok";
      autor: string;
      titulo: string;
      ano: number | null;
      paragrafos: string[];
      voz: { tipo: "ok"; audioUrl: string } | { tipo: "preparando" } | null;
    };

/** O que a folha Compartilhar no grupo recebe. */
export type LinkCompartilhado = {
  url: string;
  mensagem: string;
  comVoz: boolean;
};
