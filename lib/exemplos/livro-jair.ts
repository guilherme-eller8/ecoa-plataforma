// Dados falsos para o /styleguide e as telas de exemplo. Nada aqui é real.
// Totais são sempre calculados das linhas, nunca digitados (ver livro-jair.test.ts).
import {
  PAGINAS_INCLUSAS,
  PAGINAS_POR_FOTO_ESTIMADA,
  PALAVRAS_POR_PAGINA_ESTIMADA,
} from "@/lib/config";
import type { Etapa } from "@/lib/ui/etapas";

export type EstadoHistoria = Etapa | "pronta";

export type Historia = {
  id: string;
  titulo: string;
  estado: EstadoHistoria;
  duracaoSeg: number;
  palavras: number; // 0 enquanto a IA não escreveu
  fotos: number;
  origem: string; // de onde veio: pergunta, causo, história livre
  trecho?: string; // o começo do texto, quando já existe
  editadaPeloAutor?: boolean;
};

export type Pergunta = {
  id: string;
  texto: string;
  estado: "para_enviar" | "enviada";
  pedidaPor?: string; // quando veio de um causo da família
  enviadaHaDias?: number;
};

export type Causo = {
  id: string;
  quem: string;
  relacao: string;
  formato: "audio" | "texto";
  duracaoSeg?: number;
  texto?: string;
};

export const livro = {
  autor: { nome: "Jair", apelido: "Vô Jair" },
  responsavel: { nome: "Ana", relacao: "filha" },
};

export const historias: Historia[] = [
  {
    id: "h1",
    titulo: "A vez em Guarapari",
    estado: "escrevendo",
    duracaoSeg: 412,
    palavras: 0,
    fotos: 0,
    origem: "Causo da Tia Cida",
    trecho:
      "Era janeiro de 1971 e a gente tinha alugado uma casa a duas quadras da praia. Eu acordei com o sol já alto e",
  },
  {
    id: "h2",
    titulo: "O caminhão do meu pai",
    estado: "ouvindo",
    duracaoSeg: 400,
    palavras: 0,
    fotos: 0,
    origem: "Gravado com a Ana",
  },
  {
    id: "h3",
    titulo: "O sítio em Bom Despacho",
    estado: "revisar",
    duracaoSeg: 655,
    palavras: 1240,
    fotos: 1,
    origem: "História livre",
    trecho:
      "O sítio do meu avô ficava depois da ponte de madeira. A gente ia de charrete, e a viagem durava a manhã inteira.",
    editadaPeloAutor: true,
  },
  {
    id: "h4",
    titulo: "Quando conheci a Lurdes",
    estado: "pronta",
    duracaoSeg: 1130,
    palavras: 1820,
    fotos: 2,
    origem: "Pergunta do banco",
    trecho:
      "Foi num baile no clube da estação, em 1964. Ela estava de vestido azul e não quis dançar comigo na primeira vez.",
  },
  {
    id: "h5",
    titulo: "O primeiro emprego na estação",
    estado: "pronta",
    duracaoSeg: 840,
    palavras: 1460,
    fotos: 1,
    origem: "Pergunta do banco",
    trecho:
      "Eu tinha quinze anos quando o seu Antônio me chamou para varrer a plataforma. Ganhava pouco e achava muito.",
  },
  {
    id: "h6",
    titulo: "A enchente de 79",
    estado: "pronta",
    duracaoSeg: 720,
    palavras: 1180,
    fotos: 2,
    origem: "Gravado com a Ana",
    trecho:
      "A água subiu de noite. Quando o dia clareou, a rua tinha virado rio e o armazém do Zé estava com o balcão boiando.",
  },
  {
    id: "h7",
    titulo: "Como escolhemos o nome dos filhos",
    estado: "pronta",
    duracaoSeg: 505,
    palavras: 860,
    fotos: 1,
    origem: "Pergunta da Ana",
    trecho:
      "A Lurdes queria Ana desde menina. O nome do Paulo foi promessa, e eu nem lembro mais para qual santo.",
  },
];

export const perguntas: Pergunta[] = [
  {
    id: "p1",
    texto: "Como o Fusca atolou na estrada de Pitangui?",
    estado: "para_enviar",
    pedidaPor: "Marcos",
  },
  {
    id: "p2",
    texto: "Como era a casa onde o senhor cresceu?",
    estado: "para_enviar",
  },
  {
    id: "p3",
    texto: "O que o senhor aprendeu com o seu pai?",
    estado: "para_enviar",
  },
  {
    id: "p4",
    texto: "Qual foi a viagem mais bonita da sua vida?",
    estado: "enviada",
    enviadaHaDias: 4,
  },
  {
    id: "p5",
    texto: "Que música lembra a Lurdes?",
    estado: "enviada",
    enviadaHaDias: 1,
  },
  {
    id: "p6",
    texto: "Qual era a brincadeira preferida na infância?",
    estado: "para_enviar",
  },
];

export const causos: Causo[] = [
  {
    id: "c1",
    quem: "Marcos",
    relacao: "neto",
    formato: "audio",
    duracaoSeg: 48,
  },
  {
    id: "c2",
    quem: "Paulo",
    relacao: "filho",
    formato: "texto",
    texto:
      "Pede pra ele contar da pescaria no Rio São Francisco em que o barco virou.",
  },
];

// ── Derivados ─────────────────────────────────────────────────────────────
// Estimativa de páginas por história (valores em lib/config.ts), arredondada para cima.
export function paginasDaHistoria(h: Historia): number {
  if (h.palavras === 0) return 0;
  return Math.ceil(
    h.palavras / PALAVRAS_POR_PAGINA_ESTIMADA +
      h.fotos * PAGINAS_POR_FOTO_ESTIMADA,
  );
}

export function resumoDoLivro(lista: Historia[] = historias) {
  const paginas = lista.reduce((soma, h) => soma + paginasDaHistoria(h), 0);
  const prontas = lista.filter((h) => h.estado === "pronta").length;
  const paraRevisar = lista.filter((h) => h.estado === "revisar").length;
  const emAndamento = lista.filter(
    (h) => h.estado !== "pronta" && h.estado !== "revisar",
  ).length;
  return {
    total: lista.length,
    prontas,
    paraRevisar,
    emAndamento,
    paginas,
    paginasInclusas: PAGINAS_INCLUSAS,
  };
}

export const historiaSendoEscrita = historias.find(
  (h) => h.estado === "escrevendo",
);
export const proximaPergunta = perguntas.find(
  (p) => p.estado === "para_enviar",
)!;
