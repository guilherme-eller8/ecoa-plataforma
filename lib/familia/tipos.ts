// O que a função familia_pagina devolve, validado antes de chegar à tela.
import { z } from "zod";

export const esquemaPaginaDaFamilia = z.object({
  autor: z.string().nullable(),
  aberto: z.boolean(),
  votos_por_pessoa: z.number().int(),
  votos_por_fase: z.number().int(),
  enquete: z
    .object({
      id: z.string(),
      itens: z.array(
        z.object({
          id: z.string(),
          texto: z.string(),
          tipo: z.enum(["pergunta", "causo"]),
          fase: z.string(),
        }),
      ),
      meus_votos: z.array(z.string()),
      meu_nome: z.string().nullable(),
    })
    .nullable(),
});

export type PaginaDaFamilia = z.infer<typeof esquemaPaginaDaFamilia>;

export type AcoesFamilia = {
  votar: (
    nome: string,
    itens: string[],
  ) => Promise<{ ok: true } | { ok: false; mensagem: string }>;
  enviarCauso: (dados: {
    tipo: "pergunta" | "causo";
    nome: string;
    texto: string | null;
    audio: { mime: string } | null;
    consentimento: boolean;
  }) => Promise<
    | {
        ok: true;
        causo: string;
        upload: { caminho: string; token: string; contentType: string } | null;
      }
    | { ok: false; mensagem: string }
  >;
  confirmarAudio: (
    causo: string,
    duracaoS: number,
  ) => Promise<
    { ok: true } | { ok: false; mensagem: string; podeTentarDeNovo: boolean }
  >;
  prepararAudioDeNovo: (
    causo: string,
    mime: string,
  ) => Promise<
    | {
        ok: true;
        upload: { caminho: string; token: string; contentType: string };
      }
    | { ok: false; mensagem: string }
  >;
};
