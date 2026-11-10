// Dados falsos das telas do prompt 4 (styleguide e e2e). Nada aqui chama o servidor.
import type {
  AcoesConfiguracao,
  AcoesFotos,
  AcoesKit,
  AcoesPerguntas,
  CausoDaTela,
  EnqueteDaTela,
  FotoDaTela,
  LivroDaTela,
  PerguntaDaTela,
} from "@/lib/livro/tipos";
import type { AcoesFamilia, PaginaDaFamilia } from "@/lib/familia/tipos";
import { faseDoItem } from "@/lib/enquete/fases";
import { iniciaisDo } from "@/lib/perguntas/banco";

export const LIVRO_JAIR: LivroDaTela = {
  id: "00000000-0000-4000-8000-000000000001",
  autor: "Vô Jair",
  autorNome: "Jair",
  autorApelido: "Vô Jair",
  autorCelular: "+5531999998888",
  parentesco: "avo",
  fotoAutorUrl: null,
  configuracao: { quem: "feito", perguntas: "feito", fotos: "depois" },
  podeEscrever: true,
};

export const LIVRO_NOVO: LivroDaTela = {
  ...LIVRO_JAIR,
  autor: "Jair",
  autorApelido: null,
  autorCelular: null,
  parentesco: null,
  configuracao: {},
};

const pergunta = (
  i: number,
  extra: Partial<PerguntaDaTela> = {},
): PerguntaDaTela => {
  const p = iniciaisDo("avo")[i];
  return {
    id: `00000000-0000-4000-8000-0000000001${String(i).padStart(2, "0")}`,
    tipo: "pergunta",
    texto: p.texto,
    origem: "banco",
    bancoId: p.id,
    causoId: null,
    sugeridoPor: null,
    fotoUrl: null,
    estado: "para_enviar",
    enviadaEm: null,
    ...extra,
  };
};

export const PERGUNTAS_JAIR: PerguntaDaTela[] = [
  pergunta(0),
  pergunta(1),
  pergunta(2, { origem: "enquete" }),
  {
    ...pergunta(3),
    id: "00000000-0000-4000-8000-000000000190",
    tipo: "causo",
    texto: "Conta da vez em Guarapari que você dormiu demais e perdeu a praia.",
    origem: "causo",
    bancoId: null,
    causoId: "00000000-0000-4000-8000-000000000201",
    sugeridoPor: "Ana",
  },
  pergunta(4, { estado: "enviada", enviadaEm: "2026-11-08T12:00:00Z" }),
  pergunta(5, { estado: "pulada" }),
];

export const CAUSOS_JAIR: CausoDaTela[] = [
  {
    id: "00000000-0000-4000-8000-000000000203",
    tipo: "pergunta",
    nome: "Bia",
    texto: "Como foi o dia em que você chegou em Belo Horizonte?",
    temAudio: false,
    duracaoS: null,
    estado: "novo",
    criadoEm: "2026-11-10T09:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000201",
    tipo: "causo",
    nome: "Ana",
    texto: null,
    temAudio: true,
    duracaoS: 42,
    estado: "novo",
    criadoEm: "2026-11-09T21:10:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    tipo: "causo",
    nome: "Marcos",
    texto:
      "Pede pra ele contar do dia em que a Rural atolou na estrada de terra a caminho de Sete Lagoas.",
    temAudio: false,
    duracaoS: null,
    estado: "na_enquete",
    criadoEm: "2026-11-08T18:00:00Z",
  },
];

const item = (i: number, texto: string, banco_id: string | null) => ({
  id: `00000000-0000-4000-8000-0000000003${String(i).padStart(2, "0")}`,
  texto,
  ordem: i,
  prompt_id: null,
  banco_id,
});
const ITENS = [
  item(0, "Como era a casa onde você cresceu?", "infancia-01"),
  item(1, "Como você conheceu a vó?", "amor-01"),
  item(2, "Qual foi o seu primeiro trabalho?", "trabalho-01"),
  item(3, "Conte do dia em que a Rural atolou a caminho de Sete Lagoas.", null),
  item(4, "Qual foi a viagem mais inesquecível de vocês?", "amor-02"),
];
const voto = (i: number, votante: string, nome: string, s: number) => ({
  poll_item_id: ITENS[i].id,
  votante,
  nome,
  criado_em: `2026-11-10T12:00:${String(s).padStart(2, "0")}Z`,
});

export const ENQUETE_JAIR: EnqueteDaTela = {
  id: "00000000-0000-4000-8000-000000000300",
  estado: "aberta",
  abertaEm: "2026-11-10T11:00:00Z",
  itens: ITENS,
  votos: [
    voto(1, "a1", "Ana", 1),
    voto(3, "a1", "Ana", 1),
    voto(1, "a2", "Marcos", 2),
    voto(0, "a2", "Marcos", 2),
    voto(3, "a3", "Bia", 3),
    voto(1, "a3", "Bia", 3),
    voto(4, "a4", "Caio", 4),
    voto(3, "a5", "Lu", 5),
  ],
};

export const FOTOS_JAIR: FotoDaTela[] = [];

export const PAGINA_FAMILIA: PaginaDaFamilia = {
  autor: "Vô Jair",
  aberto: true,
  votos_por_pessoa: 18,
  votos_por_fase: 2,
  enquete: {
    id: ENQUETE_JAIR.id,
    itens: [
      ...ITENS.map((i) => ({
        id: i.id,
        texto: i.texto,
        tipo: "pergunta" as const,
        fase: faseDoItem(i.banco_id),
      })),
      {
        id: "00000000-0000-4000-8000-000000000305",
        texto: "O que você aprontava na escola?",
        tipo: "pergunta",
        fase: "estudos",
      },
      {
        id: "00000000-0000-4000-8000-000000000306",
        texto: "Qual era a brincadeira que fazia você perder a hora?",
        tipo: "pergunta",
        fase: "infancia",
      },
      {
        id: "00000000-0000-4000-8000-000000000307",
        texto: "Que cheiro da infância você nunca esqueceu?",
        tipo: "pergunta",
        fase: "infancia",
      },
    ],
    meus_votos: [],
    meu_nome: null,
  },
};

const ok = async () => ({ ok: true as const });
const okCom =
  <T>(dados: T) =>
  async () => ({ ok: true as const, dados });

export const ACOES_FALSAS = {
  configuracao: {
    salvarQuem: ok,
    salvarPerguntas: okCom({ salvas: 10 }),
    marcarPasso: ok,
  } satisfies AcoesConfiguracao,
  fotos: {
    prepararFotos: okCom([]),
    registrarFotos: okCom({ ids: [] }),
  } satisfies AcoesFotos,
  perguntas: {
    adicionarDoBanco: okCom({ salvas: 1 }),
    adicionarPropria: ok,
    mudarEstado: ok,
    apagar: ok,
    virarPergunta: ok,
    porNaEnquete: okCom({ adicionado: true }),
    urlDoAudio: async () => ({
      ok: false as const,
      mensagem: "Exemplo sem áudio.",
    }),
    abrirEnquete: ok,
    encerrarEnquete: ok,
    salvarDaEnquete: okCom({ salvas: 3 }),
    removerVotos: ok,
  } satisfies AcoesPerguntas,
  kit: {
    pegarLinkDaFamilia: okCom({
      url: "https://app.ecoa-memorias.com.br/f/v1_exemploEXEMPLOexemplo0",
    }),
    trocarLinkDaFamilia: okCom({
      url: "https://app.ecoa-memorias.com.br/f/v1_novoNOVOnovoNOVOnovo00",
    }),
  } satisfies AcoesKit,
  familia: {
    votar: ok,
    enviarCauso: async () => ({ ok: true as const, causo: "x", upload: null }),
    confirmarAudio: ok,
    prepararAudioDeNovo: async () => ({
      ok: false as const,
      mensagem: "Exemplo.",
    }),
  } satisfies AcoesFamilia,
};

export const LINK_AUTOR_EXEMPLO = "https://app.ecoa-memorias.com.br/a/em-breve";
export const LINK_FAMILIA_EXEMPLO =
  "https://app.ecoa-memorias.com.br/f/v1_exemploEXEMPLOexemplo0";
