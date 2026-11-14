import { z } from "zod";

// Retorno de servico_ouvir_qr (nunca texto da história).
export const OuvirQr = z.discriminatedUnion("estado", [
  z.object({
    estado: z.literal("ok"),
    titulo: z.string().nullable(),
    ano: z.number().int().nullable(),
    audio_caminho: z.string(),
  }),
  z.object({ estado: z.literal("preparando"), pedir_audio: z.boolean() }),
  z.object({ estado: z.literal("desativado") }),
  z.object({ estado: z.literal("nao_encontrado") }),
  z.object({ estado: z.literal("limite") }),
]);
export type OuvirQr = z.infer<typeof OuvirQr>;

// Retorno de servico_qr_trechos (o job do recorte).
export const TrechosQr = z.object({
  book_id: z.string().uuid(),
  fonte: z.string().regex(/^[0-9a-f]{64}$/),
  desativado: z.boolean(),
  gravacoes: z.array(
    z.object({
      recording_id: z.string().uuid(),
      caminho: z.string(),
      content_type: z.string().nullable(),
      duracao_s: z.number().nullable(),
      segmentos: z.array(z.number().int()).nullable(),
    }),
  ),
});
export type TrechosQr = z.infer<typeof TrechosQr>;

/** O que a tela do player recebe. */
export type EstadoPlayer =
  | { estado: "ok"; titulo: string; ano: number | null; audioUrl: string }
  | {
      estado:
        "preparando" | "desativado" | "nao_encontrado" | "limite" | "erro";
    };
