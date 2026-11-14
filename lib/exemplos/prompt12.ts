// Dados falsos do prompt 12 para o styleguide (gate de design).
import type {
  AcoesMensagem,
  AcoesMensagens,
  MensagemDoLivro,
  PaginaDaMensagem,
} from "@/lib/mensagens/tipos";

export const PAGINA_MENSAGEM: PaginaDaMensagem = {
  autor: "Jair",
  aberto: true,
};

export const TEXTO_CONFERIR =
  "Tio, lembro até hoje do senhor me ensinando a pescar no rio, de madrugada, com aquele café de garrafa. Obrigada por cada história que o senhor contou. Te amo.";

export const ACOES_MENSAGEM_FALSAS: AcoesMensagem = {
  criar: async () => ({ ok: true, id: "m1", audio: null, foto: null }),
  confirmarAudio: async () => ({ ok: true }),
  confirmarFoto: async () => ({ ok: true }),
  transcrever: async () => ({ ok: true, sugestao: TEXTO_CONFERIR }),
  enviar: async () => ({ ok: true }),
};

export const MENSAGENS_JAIR: MensagemDoLivro[] = [
  {
    id: "00000000-0000-4000-8000-000000001201",
    nome: "Lúcia",
    relacao: "sobrinha",
    estado: "enviada",
    texto: TEXTO_CONFERIR,
    textoEnviado: TEXTO_CONFERIR,
    enviadaEm: "2026-11-15T13:20:00Z",
    noLivro: true,
    duracaoS: 74,
    audioUrl: null,
    fotoUrl: null,
  },
  {
    id: "00000000-0000-4000-8000-000000001202",
    nome: "Carlos Mendes",
    relacao: "amigo do trabalho na Vale",
    estado: "enviada",
    texto:
      "Jair, foram 30 anos de turno juntos. Ninguém contava piada melhor na hora do almoço.",
    textoEnviado:
      "Jair foram 30 anos de turno juntos ninguém contava piada melhor na hora do almoço",
    enviadaEm: "2026-11-16T18:05:00Z",
    noLivro: true,
    duracaoS: null,
    audioUrl: null,
    fotoUrl: null,
  },
  {
    id: "00000000-0000-4000-8000-000000001203",
    nome: "Rafa",
    relacao: "neto",
    estado: "enviada",
    texto: "Vô, quando eu crescer quero contar história igual ao senhor.",
    textoEnviado:
      "Vô, quando eu crescer quero contar história igual ao senhor.",
    enviadaEm: "2026-11-17T09:40:00Z",
    noLivro: false,
    duracaoS: 21,
    audioUrl: null,
    fotoUrl: null,
  },
  {
    id: "00000000-0000-4000-8000-000000001204",
    nome: "Promoção",
    relacao: "loja",
    estado: "arquivada",
    texto: "Ganhe um brinde! Clique aqui.",
    textoEnviado: "Ganhe um brinde! Clique aqui.",
    enviadaEm: "2026-11-17T11:00:00Z",
    noLivro: false,
    duracaoS: null,
    audioUrl: null,
    fotoUrl: null,
  },
];

export const LINK_MENSAGEM_EXEMPLO =
  "https://app.ecoa-memorias.com.br/m/v1_EXEMPLOmensagem0000000";

const ok = async () => ({ ok: true as const });
export const ACOES_MENSAGENS_FALSAS: AcoesMensagens = {
  pegarLink: async () => ({ ok: true, dados: { url: LINK_MENSAGEM_EXEMPLO } }),
  trocarLink: async () => ({ ok: true, dados: { url: LINK_MENSAGEM_EXEMPLO } }),
  editar: ok,
  noLivro: ok,
  arquivar: ok,
  apagar: ok,
};
