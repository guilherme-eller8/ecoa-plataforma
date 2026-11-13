// Dados falsos da área do autor (styleguide e e2e). Nada aqui chama o servidor.
import type { AcoesAutor, PaginaDoAutor } from "@/lib/autor/tipos";

export const TOKEN_AUTOR_EXEMPLO = "v1_exemploAUTORexemplo000";

export const PAGINA_AUTOR: PaginaDoAutor = {
  nome: "Jair",
  consentiu: true,
  aberto: true,
  perguntas: [
    {
      id: "00000000-0000-4000-8000-000000000601",
      tipo: "causo",
      texto:
        "Conta da vez em Guarapari que você dormiu demais e perdeu a praia.",
      fotoUrl: null,
      sugestaoNome: "Ana",
      sugestaoAudioUrl: "/exemplo/causo-ana.webm",
    },
    {
      id: "00000000-0000-4000-8000-000000000602",
      tipo: "pergunta",
      texto: "Como era o caminho para a sua primeira escola?",
      fotoUrl: null,
      sugestaoNome: null,
      sugestaoAudioUrl: null,
    },
  ],
};

export const ACOES_AUTOR_FALSAS: AcoesAutor = {
  consentir: async () => ({ ok: true }),
  preparar: async (g) => ({
    ok: true,
    dados: {
      id: g.id,
      caminho: `livros/exemplo/audios/${g.id}.${g.ext}`,
      contentType: g.ext === "m4a" ? "audio/mp4" : "audio/webm",
      token: "falso",
      recebida: false,
    },
  }),
  assinar: async (id) => ({
    ok: true,
    dados: {
      id,
      caminho: `livros/exemplo/audios/${id}.webm`,
      contentType: "audio/webm",
      token: "falso",
    },
  }),
  confirmar: async () => ({ ok: true }),
};
