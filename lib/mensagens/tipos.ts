// Contratos do link /m (prompt 12): o que a página recebe e as ações que a tela chama.
import { z } from "zod";

export const esquemaPaginaDaMensagem = z.object({
  autor: z.string().nullable(),
  aberto: z.boolean(),
});
export type PaginaDaMensagem = z.infer<typeof esquemaPaginaDaMensagem>;

export type Upload = { caminho: string; token: string; contentType: string };
type Falha = { ok: false; mensagem: string };

export type AcoesMensagem = {
  criar: (dados: {
    nome: string;
    relacao: string;
    audio: { mime: string } | null;
    foto: boolean;
    consentimento: boolean;
  }) => Promise<
    { ok: true; id: string; audio: Upload | null; foto: Upload | null } | Falha
  >;
  confirmarAudio: (
    id: string,
    duracaoS: number,
  ) => Promise<{ ok: true } | (Falha & { regravar: boolean })>;
  confirmarFoto: (id: string) => Promise<{ ok: boolean }>;
  /** Sugestão de texto (sem hesitações). escrever = a pessoa digita; regravar = áudio longo. */
  transcrever: (
    id: string,
  ) => Promise<
    | { ok: true; sugestao: string }
    | { ok: false; espera: true }
    | (Falha & { escrever: boolean; regravar: boolean })
  >;
  enviar: (id: string, texto: string) => Promise<{ ok: true } | Falha>;
};

/** Tela de membros (/livro/[id]/mensagens). */
export type MensagemDoLivro = {
  id: string;
  nome: string;
  relacao: string;
  estado: "enviada" | "arquivada";
  texto: string;
  textoEnviado: string;
  enviadaEm: string;
  noLivro: boolean;
  duracaoS: number | null;
  audioUrl: string | null;
  fotoUrl: string | null;
};

type R<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { dados: T }))
  | { ok: false; mensagem: string };

export type AcoesMensagens = {
  pegarLink: () => Promise<R<{ url: string }>>;
  trocarLink: () => Promise<R<{ url: string }>>;
  editar: (mensagem: string, texto: string) => Promise<R>;
  noLivro: (mensagem: string, incluir: boolean) => Promise<R>;
  arquivar: (mensagem: string, arquivar: boolean) => Promise<R>;
  apagar: (mensagem: string) => Promise<R>;
};
