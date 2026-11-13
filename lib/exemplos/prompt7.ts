// Dados falsos das telas do prompt 7 (styleguide e e2e): uma conversa de ceia em 2 partes,
// dividida em 3 histórias. Personagens fictícios. Nada aqui chama o servidor.
import type { AcoesDivisao, DivisaoDaTela } from "@/lib/divisao/tipos";
import type { SegmentoTela } from "@/lib/divisao/trechos";
import type { HistoriaDaTela, HistoriaParaLer } from "@/lib/historias/tipos";
import { HISTORIA_PARA_LER, HISTORIAS_JAIR, LIVRO_JAIR } from "./prompt6";

export { LIVRO_JAIR };

const id = (n: number) =>
  `00000000-0000-4000-8000-0000000007${String(n).padStart(2, "0")}`;

export const PERGUNTA_ESCOLA = id(90);

// Falas da ceia, em ordem. Cada uma vira um segmento de ~25 s (trechos de ~1 min na tela).
const FALAS: [string, string][] = [
  [
    "g1",
    "A gente morava lá na roça, perto de Cachoeiro, numa casa de pau a pique.",
  ],
  ["g1", "Meu pai acordava antes do galo pra tirar leite das vacas."],
  ["g1", "E a gente ia junto, eu e o Tião, descalço no sereno."],
  ["g1", "Minha mãe fazia o café no fogão de lenha e o cheiro tomava a casa."],
  ["g1", "Depois do leite, cada um pegava a enxada e ia pro cafezal."],
  ["g1", "Escola mesmo só fui com nove anos, lá no grupo escolar da vila."],
  ["g1", "Andava uma légua a pé, com a merenda enrolada num pano."],
  ["g1", "A professora era a dona Cotinha, brava que só ela."],
  ["g1", "Quem não sabia a tabuada ficava em pé no canto da sala."],
  ["g1", "Eu aprendi a ler com o almanaque que o meu avô guardava."],
  [
    "g2",
    "Aí veio o baile da Festa de São Pedro, em mil novecentos e sessenta.",
  ],
  ["g2", "Foi lá que eu vi a Lurdes pela primeira vez, de vestido azul."],
  ["g2", "Tirei ela pra dançar e ela disse que não, que tava cansada."],
  ["g2", "No outro sábado eu voltei, e no outro também."],
  ["g2", "Na terceira vez ela aceitou, e a gente dançou a noite inteira."],
  ["g2", "Casamos dois anos depois, na capela de Santa Rita."],
];

export const SEGMENTOS_CEIA: SegmentoTela[] = FALAS.map(([g, texto], i) => {
  const parte = g === "g1" ? 1 : 2;
  const n = parte === 1 ? i : i - 10;
  return {
    id: i + 1,
    gravacao: parte === 1 ? id(51) : id(52),
    parte,
    inicio: n * 26,
    fim: n * 26 + 25,
    texto,
  };
});

export const DIVISAO_CEIA: DivisaoDaTela = {
  historiaId: id(1),
  situacao: "separar",
  propostas: [
    {
      titulo: "As madrugadas na roça",
      segmentos: [[1, 5]],
      promptId: null,
      sugeridaId: null,
    },
    {
      titulo: "A escola da dona Cotinha",
      segmentos: [[6, 10]],
      promptId: null,
      sugeridaId: PERGUNTA_ESCOLA,
    },
    {
      titulo: "O baile de São Pedro",
      segmentos: [[11, 16]],
      promptId: null,
      sugeridaId: null,
    },
  ],
  segmentos: SEGMENTOS_CEIA,
  audios: [
    { gravacao: id(51), parte: 1, url: "/exemplo/audio-1.opus" },
    { gravacao: id(52), parte: 2, url: "/exemplo/audio-1.opus" },
  ],
  perguntas: {
    [PERGUNTA_ESCOLA]: "Como era a escola quando o senhor era criança?",
  },
};

export const DIVISAO_CONFIRMADA: DivisaoDaTela = {
  ...DIVISAO_CEIA,
  situacao: "confirmada",
  propostas: [],
  segmentos: [],
  audios: [],
  perguntas: {},
};

/** Guarda a carga do confirmar na janela: o e2e confere o que iria ao servidor. */
export const ACOES_DIVISAO_FALSAS: AcoesDivisao = {
  async confirmar(historias, ajustes) {
    if (typeof window !== "undefined")
      (window as unknown as { __confirmado: unknown }).__confirmado = {
        historias,
        ajustes,
      };
    return { ok: false, mensagem: "Exemplo: nada foi enviado." };
  },
};

/** Home com o contêiner em "conferir" e outro "separando". */
export const HISTORIAS_COM_DIVISAO: HistoriaDaTela[] = [
  {
    id: id(1),
    titulo: null,
    estado: "separar",
    duracaoS: 2520,
    origem: "conversa",
    pergunta: null,
    trecho: null,
    criadaEm: "2026-12-24T23:10:00Z",
    vista: false,
    gravacoes: 2,
    propostas: 3,
    dividida: false,
    revisada: false,
  },
  {
    id: id(2),
    titulo: null,
    estado: "dividindo",
    duracaoS: 480,
    origem: "lote",
    pergunta: null,
    trecho: null,
    criadaEm: "2026-12-24T23:30:00Z",
    vista: false,
    gravacoes: 8,
    propostas: null,
    dividida: false,
    revisada: false,
  },
  ...HISTORIAS_JAIR.slice(1, 2),
];

export const HISTORIA_COM_SUGESTAO: HistoriaParaLer = {
  ...HISTORIA_PARA_LER,
  sugestao: {
    id: PERGUNTA_ESCOLA,
    texto: "Como era a escola quando o senhor era criança?",
  },
};
