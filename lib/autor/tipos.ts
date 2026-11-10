// O que as portas do autor devolvem, validado antes de chegar à tela (prompt 5, fase B).
import { z } from "zod";
import type { RespostaEnvio, Preparo } from "@/lib/gravacao/envio";
import type { AudioPreparado } from "@/lib/livro/tipos";

export const esquemaPaginaDoAutor = z.object({
  nome: z.string().nullable(),
  consentiu: z.boolean(),
  aberto: z.boolean(),
  perguntas: z.array(
    z.object({
      id: z.uuid(),
      tipo: z.enum(["pergunta", "causo"]),
      texto: z.string(),
      foto: z.string().nullable(),
      sugestao_nome: z.string().nullable(),
      sugestao_audio: z.string().nullable(),
    }),
  ),
});

export const esquemaPreparoDoAutor = z.object({
  id: z.uuid(),
  caminho: z.string(),
  recebida: z.boolean(),
});

/** Pergunta como a tela do autor mostra: caminhos trocados por URLs assinadas por 1 h. */
export type PerguntaDoAutor = {
  id: string;
  tipo: "pergunta" | "causo";
  texto: string;
  fotoUrl: string | null;
  sugestaoNome: string | null;
  sugestaoAudioUrl: string | null;
};

export type PaginaDoAutor = {
  nome: string;
  consentiu: boolean;
  aberto: boolean;
  perguntas: PerguntaDoAutor[];
};

export type GravacaoParaPreparar = {
  id: string;
  promptId: string | null;
  ext: "webm" | "m4a";
  tamanho: number;
  duracaoS: number;
};

/** Ações do link do autor, já ligadas ao token pelo servidor. */
export type AcoesAutor = {
  consentir: () => Promise<{ ok: boolean; mensagem?: string }>;
  preparar: (g: GravacaoParaPreparar) => Promise<RespostaEnvio<Preparo>>;
  assinar: (id: string) => Promise<RespostaEnvio<AudioPreparado>>;
  confirmar: (id: string) => Promise<RespostaEnvio>;
};
