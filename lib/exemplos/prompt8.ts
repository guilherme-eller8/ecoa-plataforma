// Dados falsos do editor (prompt 8), para o styleguide e o e2e. Nada aqui chama o servidor.
// Personagens fictícios. A trava e o salvamento ficam na memória da página.
import type { AcoesEditor, AcoesVersoes } from "@/lib/editor/tipos";
import type { SegmentoDaTela } from "@/lib/editor/ouvir";
import type {
  HistoriaParaEditar,
  TextoAtualDaTela,
  VersaoDaTela,
} from "@/lib/historias/tipos";
import type { FotoDaTela } from "@/lib/livro/tipos";
import { LIVRO_JAIR } from "./prompt6";

const id = (n: number) =>
  `00000000-0000-4000-8000-0000000008${String(n).padStart(2, "0")}`;

// Foto de exemplo sem arquivo: um retângulo de cor, desenhado em SVG.
const foto = (cor: string, l: number, a: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${l}" height="${a}" viewBox="0 0 ${l} ${a}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cor}"/><stop offset="1" stop-color="#26211d"/></linearGradient></defs><rect width="${l}" height="${a}" fill="url(#g)"/></svg>`,
  )}`;

const GRAVACAO = id(90);

export const SEGMENTOS_TREM: SegmentoDaTela[] = [
  [
    1,
    0,
    9.5,
    "Entrevistador",
    "Pai, conta aquela vez que o senhor foi pra Vitória.",
  ],
  [
    2,
    9.5,
    21,
    "Vô Jair",
    "Ah, eu tinha dezoito anos. Peguei o trem lá em Cachoeiro, ainda escuro, de madrugada.",
  ],
  [
    3,
    21,
    30.2,
    "Vô Jair",
    "Levava uma mala de papelão e um pão com mortadela que a mãe fez pra mim.",
  ],
  [
    4,
    30.2,
    38,
    "Vô Jair",
    "Fui pra Vitória procurar serviço, né, que lá em casa não tinha.",
  ],
  [
    5,
    38,
    49.5,
    "Vô Jair",
    "Aí cheguei na oficina e o homem falou que a vaga já era de outro. Não deu certo.",
  ],
  [6, 49.5, 57, "Vô Jair", "Dormi na rodoviária mesmo, no banco."],
  [7, 57, 63, "Entrevistador", "E o Tião?"],
  [
    8,
    63,
    76,
    "Vô Jair",
    "O Tião, meu primo, no outro dia me arrumou um bico de ajudante de pedreiro. Fiquei três anos lá.",
  ],
].map(([n, inicio, fim, falante, texto]) => ({
  id: n as number,
  gravacao: GRAVACAO,
  inicio: inicio as number,
  fim: fim as number,
  falante: falante as string,
  texto: texto as string,
}));

export const HISTORIA_PARA_EDITAR: HistoriaParaEditar = {
  id: id(1),
  livroId: LIVRO_JAIR.id,
  autor: "Vô Jair",
  pergunta: null,
  sugestao: null,
  texto: {
    titulo: "O trem de Cachoeiro",
    ano: null,
    paragrafos: [
      {
        id: "p1",
        texto:
          "Eu tinha dezoito anos quando peguei o trem em Cachoeiro, ainda escuro. Levava uma mala de papelão e um pão com mortadela que a mãe fez. Fui para Vitória procurar serviço.",
        fontes: [2, 3, 4],
        editado: false,
      },
      {
        id: "p2",
        texto:
          "Não deu certo. Cheguei e o homem da oficina falou que a vaga já era de outro. Dormi na rodoviária, e até hoje fico emocionado quando lembro.",
        fontes: [5, 6],
        editado: false,
      },
      {
        id: "p3",
        texto:
          "No outro dia o Tião, meu primo, me arrumou um bico de ajudante de pedreiro. Fiquei três anos lá.",
        fontes: [8],
        editado: false,
      },
    ],
    lacunas: [
      {
        pergunta: "Em que ano o senhor foi para Vitória?",
        motivo: "o áudio não diz o ano",
      },
    ],
  },
  marcacoes: [
    {
      paragrafo: 2,
      inicio: 101,
      fim: 139,
      trecho: "até hoje fico emocionado quando lembro",
      tipo: "emocao",
      origem: "verificador",
      motivo: "Sem sustentação: o autor não fala de emoção nesse trecho.",
    },
  ],
  rev: 0,
  revisada: false,
  segmentos: SEGMENTOS_TREM,
  audios: [{ id: GRAVACAO, url: "/exemplo/trem.m4a" }], // silêncio de 76 s
  fotos: [
    {
      id: id(20),
      url: foto("#8a6f52", 2400, 1800),
      largura: 2400,
      altura: 1800,
      legenda: "Estação de Cachoeiro, anos 60",
    },
    {
      id: id(21),
      url: foto("#5d6b5a", 900, 640),
      largura: 900,
      altura: 640,
      legenda: null,
    },
  ],
  versoes: 3,
  tamanho: "medio",
  propostas: [],
  audiosForaDoTexto: 0,
};

const ACERVO: FotoDaTela[] = [22, 23, 24].map((n, i) => ({
  id: id(n),
  url: foto(["#a7845e", "#6e6259", "#1f3d33"][i], 2000, 1500),
  largura: 2000,
  altura: 1500,
  legenda: null,
}));

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ações falsas: `trava` decide o que a tela vê ao abrir. */
export function acoesEditorFalsas(
  trava: "livre" | "outra-pessoa" | "outra-tela" = "livre",
): AcoesEditor {
  let rev = 0;
  let dona = trava === "livre";
  return {
    async editar(_aba, { pegar, assumir }) {
      await espera(80);
      if (trava === "outra-tela" && assumir) dona = true;
      if (!dona && trava === "outra-pessoa")
        return {
          ok: true,
          dados: { editando: false, outraTela: false, nome: "Ana" },
        };
      if (!dona && trava === "outra-tela")
        return {
          ok: true,
          dados: { editando: false, outraTela: true, nome: null },
        };
      return {
        ok: true,
        dados: { editando: pegar, outraTela: false, nome: null },
      };
    },
    async salvar() {
      await espera(250);
      return { ok: true, rev: ++rev };
    },
    async pararDeEditar() {},
    async marcarPronta() {
      await espera(200);
      return { ok: true };
    },
    async acervo() {
      await espera(150);
      return { ok: true, dados: ACERVO };
    },
    async ligarFotos(ids) {
      await espera(150);
      return {
        ok: true,
        dados: {
          fotos: [
            ...HISTORIA_PARA_EDITAR.fotos,
            ...ACERVO.filter((f) => ids.includes(f.id)),
          ],
        },
      };
    },
    async tirarFoto() {
      return { ok: true };
    },
    async legendar() {
      return { ok: true };
    },
    async prepararFotos() {
      return { ok: true, dados: [] };
    },
    async registrarFotos() {
      return { ok: true, dados: { ids: [] } };
    },
  };
}

export const VERSOES_TREM: VersaoDaTela[] = [
  {
    numero: 3,
    origem: "responsavel",
    minha: false,
    criadaEm: "2026-11-13T17:40:00Z",
    restauradaDe: null,
    proposta: null,
    tamanho: "medio",
    titulo: "O trem de Cachoeiro",
    paragrafos: [
      "Eu tinha dezoito anos quando peguei o trem em Cachoeiro, ainda escuro.",
      "Não deu certo. Dormi na rodoviária.",
    ],
  },
  {
    numero: 2,
    origem: "responsavel",
    minha: true,
    criadaEm: "2026-11-13T15:02:00Z",
    restauradaDe: null,
    proposta: null,
    tamanho: "medio",
    titulo: "O trem",
    paragrafos: [
      "Eu tinha dezoito anos quando peguei o trem de ferro em Cachoeiro.",
    ],
  },
  {
    numero: 1,
    origem: "ia",
    minha: false,
    criadaEm: "2026-11-13T14:10:00Z",
    restauradaDe: null,
    proposta: null,
    tamanho: "medio",
    titulo: "O trem de Cachoeiro",
    paragrafos: HISTORIA_PARA_EDITAR.texto.paragrafos.map((p) => p.texto),
  },
];

export const TEXTO_ATUAL_TREM: TextoAtualDaTela = {
  minha: true,
  origem: "responsavel",
  em: "2026-11-13T18:05:00Z",
  titulo: "O trem de Cachoeiro",
  paragrafos: [
    "Eu tinha dezoito anos quando peguei o trem em Cachoeiro, ainda escuro, em 1962.",
  ],
};

export const ACOES_VERSOES_FALSAS: AcoesVersoes = {
  async restaurar() {
    await espera(200);
    return { ok: true, dados: { rev: 9 } };
  },
};
