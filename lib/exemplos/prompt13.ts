// Dados falsos do prompt 13 (montar e publicar): 6 histórias e 2 mensagens, o caso do aceite.
// Nada aqui é real. Usado pelo styleguide, pelos testes dos templates e pela contagem de exemplo.
import type { ConteudoDoLivro } from "@/lib/livro/montagem";

const P1 =
  "A gente saía de Belo Horizonte ainda de madrugada. Minha mãe acordava todo mundo às quatro, com o café já passado e o pão com manteiga embrulhado no guardanapo de pano. O trem era lento, parava em tudo que era estação, e a gente ia contando as vacas pela janela até o sol aparecer.";
const P2 =
  "Meu pai nunca foi de falar muito, mas naquela viagem ele contou da vez em que o trem quebrou no meio do caminho e todo mundo desceu para empurrar. Eu era pequeno e achei que era brincadeira. Voltei para casa com os joelhos ralados e a certeza de que aquilo era a melhor aventura do mundo.";
const P3 =
  "Na chegada, a praia estava vazia. O mar era muito maior do que eu tinha imaginado, e o barulho dele me assustou tanto que me escondi atrás da saia da minha avó. Ela riu, me pegou pela mão e me levou até a beira da água, onde a espuma gelada me fez rir também.";

const paragrafos = (n: number) =>
  Array.from({ length: n }, (_, i) => [P1, P2, P3][i % 3]);

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const TITULOS_EXEMPLO = [
  "O trem para Guarapari",
  "A casa da rua Bahia",
  "Como conheci a Maria",
  "O primeiro emprego",
  "O dia em que choveu pedra",
  "Natal de 1974",
];

export function conteudoDeExemplo(
  sobrescrever: Partial<ConteudoDoLivro["livro"]> = {},
): ConteudoDoLivro {
  return {
    livro: {
      titulo: "Histórias do Vô Jair",
      subtitulo: "Do trem de Guarapari à casa da rua Bahia",
      dedicatoria: "Para os netos, que ainda vão pedir mais uma história.",
      autor: "Jair Souza",
      capa_cor: "terracota",
      rev: 1,
      capa_foto: null,
      ...sobrescrever,
    },
    historias: TITULOS_EXEMPLO.map((titulo, i) => ({
      id: uuid(i + 1),
      titulo,
      ano: [1962, 1958, 1971, 1975, 1980, 1974][i],
      revisada: true,
      incluida: true,
      palavras: 120 * (i + 2),
      paragrafos: paragrafos(i + 2),
      fotos: [],
      qr: { codigo: `7KQ2M9X${"ABCDEF"[i]}`, ligado: true },
    })),
    mensagens: [
      {
        id: uuid(101),
        nome: "Bia",
        relacao: "neta",
        incluida: true,
        texto:
          "Vô, eu adoro quando o senhor conta da praia. Ontem contei para a minha turma da escola e todo mundo quis saber mais.\n\nObrigada por cada história.",
        foto: null,
        com_audio: true,
        qr: { codigo: "8MNP3QRS", ligado: true },
      },
      {
        id: uuid(102),
        nome: "Tia Lúcia",
        relacao: "filha",
        incluida: true,
        texto: "Pai, que bom ter tudo isso guardado. Com amor, Lúcia.",
        foto: null,
        com_audio: false,
        qr: null,
      },
    ],
  };
}
