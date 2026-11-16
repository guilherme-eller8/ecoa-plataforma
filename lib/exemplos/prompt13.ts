// Dados falsos do prompt 13 (montar e publicar): 6 histórias e 2 mensagens, o caso do aceite.
// Nada aqui é real. Usado pelo styleguide, pelos testes dos templates e pela contagem de exemplo.
import { alertasDoLivro } from "@/lib/livro/alertas";
import { vaiComQr, type ConteudoDoLivro } from "@/lib/livro/montagem";
import type {
  AcoesMontar,
  AcoesVersao,
  ContagemDoLivro,
  MontagemDaTela,
  VersaoPublicada,
} from "@/lib/livro/montar-tipos";

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

// ── Vitrine das telas de montagem e da versão publicada ───────────────────

const HASH_EXEMPLO = "a".repeat(64);

/** Uma capa aberta desenhada à mão (SVG em data URL), só para a vitrine. */
export const PREVIA_CAPA_EXEMPLO = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 357 246"><rect width="357" height="246" fill="#b9633f"/><rect x="174" width="9" height="246" fill="#a5562f"/><g fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".5"><path d="M15 0v246M342 0v246M0 15h357M0 231h357"/></g><text x="199" y="140" font-family="Georgia,serif" font-size="12" font-weight="600" fill="#fff">Histórias do Vô Jair</text><text x="199" y="153" font-family="Georgia,serif" font-size="6" font-style="italic" fill="#fff">Do trem de Guarapari à casa da rua Bahia</text></svg>`,
)}`;

const pagina = (n: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 154 216"><rect width="154" height="216" fill="#fff"/><text x="77" y="206" text-anchor="middle" font-family="Georgia,serif" font-size="7" fill="#777">${n}</text><g fill="#999"><rect x="23" y="40" width="108" height="3"/><rect x="23" y="50" width="108" height="3"/><rect x="23" y="60" width="90" height="3"/><rect x="23" y="80" width="108" height="3"/><rect x="23" y="90" width="100" height="3"/></g></svg>`,
  )}`;

/** Uma história que falta revisar e outra curtíssima: dois avisos, um vermelho e um amarelo. */
export const QUEBRAR_LIVRO = (c: ConteudoDoLivro) => {
  c.historias[0].revisada = false;
  c.historias[1].palavras = 60;
};

export function montagemDeExemplo(
  mudar: (c: ConteudoDoLivro) => void = () => {},
  extra: Partial<MontagemDaTela> = {},
): MontagemDaTela {
  const c = conteudoDeExemplo();
  mudar(c);
  return {
    rev: 3,
    hash: HASH_EXEMPLO,
    titulo: c.livro.titulo ?? "Histórias do Vô Jair",
    tituloEscolhido: Boolean(c.livro.titulo),
    subtitulo: c.livro.subtitulo ?? "",
    dedicatoria: c.livro.dedicatoria ?? "",
    capaCor: "terracota",
    capaFotoId: null,
    capaFocoX: 50,
    capaFocoY: 50,
    capaFotoUrl: null,
    fotos: [],
    historias: c.historias.map((h) => ({
      id: h.id,
      titulo: h.titulo,
      ano: h.ano,
      revisada: h.revisada,
      incluida: h.incluida,
      palavras: h.palavras,
      comQr: vaiComQr(h),
    })),
    mensagens: c.mensagens.map((m) => ({
      id: m.id,
      nome: m.nome,
      relacao: m.relacao,
      incluida: m.incluida,
      previa: (m.texto ?? "").slice(0, 120),
      comQr: vaiComQr(m),
    })),
    alertas: alertasDoLivro(c),
    proximaVersao: 1,
    versoes: [],
    responsavel: "Ana Souza",
    paginasIniciais: null,
    ...extra,
  };
}

export function acoesDeMontarFalsas(
  paginas = 72,
  mudar: (c: ConteudoDoLivro) => void = () => {},
): AcoesMontar {
  const c = conteudoDeExemplo();
  mudar(c);
  const contagem: ContagemDoLivro = {
    paginas,
    extras: Math.max(0, paginas - 80),
    hash: HASH_EXEMPLO,
    linhasDoTitulo: 1,
    alertas: alertasDoLivro(c, { tituloCapaLinhas: 1 }),
  };
  return {
    salvar: async () => ({ ok: true, dados: { rev: 4 } }),
    mensagemNoLivro: async () => ({ ok: true }),
    contar: async () => ({ ok: true, dados: contagem }),
    previaCapa: async () => ({
      ok: true,
      dados: { imagem: PREVIA_CAPA_EXEMPLO },
    }),
    publicar: async () => ({ ok: true, dados: { versao: 1 } }),
  };
}

export const VERSAO_PRONTA: VersaoPublicada = {
  id: "00000000-0000-4000-8000-000000001301",
  versao: 1,
  estado: "pronta",
  paginas: 84,
  lombadaMm: 9.2,
  criadoEm: "2026-11-15T13:20:00Z",
  qrEsperados: 8,
  vozesProntas: 7,
  capaUrl: PREVIA_CAPA_EXEMPLO,
  previasUrls: [1, 2, 3, 4].map(pagina),
};

export const ACOES_VERSAO_FALSAS: AcoesVersao = {
  estado: async () => ({ ok: true, dados: VERSAO_PRONTA }),
  previas: async (de) => ({
    ok: true,
    dados: { urls: [0, 1, 2, 3].map((i) => pagina(de + i)) },
  }),
  baixar: async () => ({ ok: true, dados: { url: "#" } }),
};
