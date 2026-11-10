// Dados falsos das telas do prompt 5A (styleguide e e2e). Nada aqui chama o servidor.
import type { ItemAudio } from "@/components/audios/subir-audios";
import type { EnviarArquivo } from "@/lib/audios/tus";
import type { AcoesAudios, AudioDaTela } from "@/lib/livro/tipos";
import { LIVRO_JAIR, PERGUNTAS_JAIR } from "./prompt4";

export { LIVRO_JAIR };

export const PERGUNTAS_PENDENTES = PERGUNTAS_JAIR.filter(
  (p) => p.estado === "para_enviar" || p.estado === "enviada",
);

const id = (n: number) =>
  `00000000-0000-4000-8000-0000000005${String(n).padStart(2, "0")}`;

export const ACOES_AUDIOS_FALSAS: AcoesAudios = {
  prepararAudios: async (arquivos) => ({
    ok: true,
    dados: arquivos.map((a, i) => ({
      id: id(i + 1),
      caminho: `livros/${LIVRO_JAIR.id}/audios/${id(i + 1)}.opus`,
      token: "falso",
      contentType: "audio/ogg",
    })),
  }),
  reassinarAudio: async (audio) => ({
    ok: true,
    dados: {
      id: audio,
      caminho: `livros/${LIVRO_JAIR.id}/audios/${audio}.opus`,
      token: "falso",
      contentType: "audio/ogg",
    },
  }),
  confirmarAudio: async () => ({ ok: true }),
};

/** Sobe "de mentira" em ~1 s, com progresso. */
export const ENVIAR_FALSO: EnviarArquivo = async (_a, _p, aoProgresso) => {
  for (const f of [0.25, 0.5, 0.75, 1]) {
    await new Promise((r) => setTimeout(r, 200));
    aoProgresso(f);
  }
};

const arquivo = (nome: string, kb: number) =>
  new File([new Uint8Array(kb * 1024)], nome, { type: "" });

/** Um de cada estado, para o gate de design. Chaves fixas: o SSR e o navegador batem. */
export function itensDeExemplo(): ItemAudio[] {
  const base = {
    recusa: null,
    promptId: "",
    titulo: "",
    estado: "escolhido" as const,
    progresso: 0,
  };
  return [
    {
      ...base,
      chave: "a",
      arquivo: arquivo("PTT-20261109-WA0003.opus", 412),
      duracaoS: 185,
      promptId: PERGUNTAS_PENDENTES[0]?.id ?? "",
    },
    {
      ...base,
      chave: "b",
      arquivo: arquivo("Gravação 12.m4a", 2400),
      duracaoS: 1325,
      titulo: "O dia em que a ponte caiu",
    },
    {
      ...base,
      chave: "c",
      arquivo: arquivo("PTT-20261108-WA0011.opus", 96),
      duracaoS: 48,
      estado: "enviando",
      progresso: 0.45,
    },
    {
      ...base,
      chave: "d",
      arquivo: arquivo("video-da-ceia.mp4", 64),
      duracaoS: null,
      recusa:
        "«video-da-ceia.mp4» não é áudio. Use .opus, .m4a, .mp3, .ogg, .wav ou .webm.",
    },
  ];
}

export const AUDIOS_JAIR: AudioDaTela[] = [
  {
    id: id(1),
    titulo: null,
    nomeArquivo: "PTT-20261109-WA0003.opus",
    pergunta: PERGUNTAS_JAIR[0]?.texto ?? null,
    duracaoS: 185,
    tamanhoBytes: 412 * 1024,
    recebidoEm: "2026-11-09T17:32:00Z",
    url: "/exemplo/audio-1.opus",
    processado: false,
  },
  {
    id: id(2),
    titulo: "O dia em que a ponte caiu",
    nomeArquivo: "Gravação 12.m4a",
    pergunta: null,
    duracaoS: 1325,
    tamanhoBytes: 2400 * 1024,
    recebidoEm: "2026-11-09T15:05:00Z",
    url: "/exemplo/audio-2.m4a",
    processado: false,
  },
  {
    id: id(3),
    titulo: null,
    nomeArquivo: "PTT-20261108-WA0011.opus",
    pergunta: null,
    duracaoS: 48,
    tamanhoBytes: 96 * 1024,
    recebidoEm: "2026-11-08T22:41:00Z",
    url: "/exemplo/audio-3.opus",
    processado: false,
  },
];
