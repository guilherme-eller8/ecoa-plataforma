// Dados falsos das telas do prompt 6 (styleguide e e2e). Nada aqui chama o servidor.
// Personagens fictícios.
import type { AoVivo } from "@/components/ui/historias-ao-vivo";
import type {
  CustoDoLivro,
  Esperando,
  Falha,
} from "@/components/telas/admin-processamento";
import type {
  GuardadaDaTela,
  HistoriaDaTela,
  HistoriaParaLer,
  NomeDaTela,
} from "@/lib/historias/tipos";
import type { AudioDaTela, Resposta } from "@/lib/livro/tipos";
import { AUDIOS_JAIR, LIVRO_JAIR } from "./prompt5a";

export { LIVRO_JAIR };

const id = (n: number) =>
  `00000000-0000-4000-8000-0000000006${String(n).padStart(2, "0")}`;

export const HISTORIAS_JAIR: HistoriaDaTela[] = [
  {
    id: id(1),
    titulo: null,
    estado: "escrevendo",
    duracaoS: 312,
    origem: "autor",
    pergunta: "Como era a casa onde o senhor cresceu?",
    trecho: null,
    criadaEm: "2026-11-11T14:02:00Z",
    vista: false,
    gravacoes: 1,
    propostas: null,
    dividida: false,
    revisada: false,
  },
  {
    id: id(2),
    titulo: "O trem de Cachoeiro",
    estado: "pronta",
    duracaoS: 185,
    origem: "upload",
    pergunta: null,
    trecho:
      "Eu tinha dezoito anos quando peguei o trem de ferro em Cachoeiro, ainda escuro, com uma mala de papelão e um pão com mortadela que a mãe fez.",
    criadaEm: "2026-11-10T19:20:00Z",
    vista: true,
    gravacoes: 1,
    propostas: null,
    dividida: false,
    revisada: false,
  },
  {
    id: id(3),
    titulo: null,
    estado: "falhou",
    duracaoS: 48,
    origem: "upload",
    pergunta: null,
    trecho: null,
    criadaEm: "2026-11-10T18:00:00Z",
    vista: false,
    gravacoes: 1,
    propostas: null,
    dividida: false,
    revisada: false,
  },
];

export const AO_VIVO_JAIR: Record<string, AoVivo> = {
  [id(1)]: {
    etapa: "escrevendo",
    tentativa: 1,
    titulo: "A casa da Rua do Sol",
    paragrafos: [
      "A casa era de taipa, com o chão de terra batida que a mãe varria toda manhã.",
      "No fundo tinha um pé de jabuticaba, e na época a gente subia",
    ],
  },
};

export const HISTORIA_PARA_LER: HistoriaParaLer = {
  id: id(2),
  titulo: "O trem de Cachoeiro",
  estado: "pronta",
  pergunta: null,
  paragrafos: [
    "Eu tinha dezoito anos quando peguei o trem de ferro em Cachoeiro, ainda escuro, com uma mala de papelão e um pão com mortadela que a mãe fez. Fui para Vitória procurar serviço.",
    "Não deu certo. Cheguei e o homem da oficina falou que a vaga já era de outro. Dormi na rodoviária, e até hoje fico emocionado quando lembro.",
    "No outro dia o Tião, meu primo, me arrumou um bico de ajudante de pedreiro. Fiquei três anos lá.",
  ],
  marcacoes: [
    {
      paragrafo: 2,
      inicio: 101,
      fim: 139,
      trecho: "até hoje fico emocionado quando lembro",
      tipo: "emocao",
      origem: "verificador",
      motivo: "sem sustentação: o autor não fala de emoção nesse trecho.",
    },
  ],
  lacunas: [
    {
      pergunta: "Em que ano o senhor foi para Vitória?",
      motivo: "o áudio não diz o ano",
    },
  ],
  audios: [{ id: id(9), url: "/exemplo/audio-1.opus", duracaoS: 185 }],
  sugestao: null,
};

export const NOMES_JAIR: NomeDaTela[] = [
  {
    id: id(11),
    tipo: "pessoa",
    nome: "Tião",
    apelidos: [],
    estado: "sugerido",
  },
  {
    id: id(12),
    tipo: "lugar",
    nome: "Cachoeiro",
    apelidos: [],
    estado: "sugerido",
  },
  {
    id: id(13),
    tipo: "pessoa",
    nome: "Dona Cida",
    apelidos: ["Cida"],
    estado: "aceito",
  },
];

export const AUDIOS_COM_SITUACAO: AudioDaTela[] = AUDIOS_JAIR.map((a, i) => ({
  ...a,
  situacao:
    i === 0
      ? { tipo: "historia", historia: id(2), estado: "pronta" }
      : i === 1
        ? {
            tipo: "espera",
            rotulo: "Esperando os outros 2",
            frase: "Guardada. Esperando os outros áudios do envio.",
            confirmar: false,
          }
        : {
            tipo: "espera",
            rotulo: "Confirme o uso da IA",
            frase: "Guardada. Confirme o uso da IA para virar texto.",
            confirmar: true,
          },
}));

const ok = async (): Promise<Resposta> => ({ ok: true });
export const ACOES_CONFIGURACOES_FALSAS = {
  confirmarIA: ok,
  ajustar: ok,
  acrescentar: ok,
};

export const FALHAS_FALSAS: Falha[] = [
  {
    id: id(3),
    autor: "Jair",
    etapa: "transcrever",
    codigo: "scribe_falhou",
    quando: "2026-11-10T18:04:00Z",
  },
];
export const ESPERANDO_FALSAS: Esperando[] = [
  {
    id: id(21),
    autor: "Dona Lurdes",
    origem: "conversa",
    duracaoS: 2400,
    quando: "2026-11-11T10:00:00Z",
  },
];
export const CUSTOS_FALSOS: CustoDoLivro[] = [
  { autor: "Jair", reais: 2.47, historias: 3, minutos: 19 },
];

export const GUARDADAS_JAIR: GuardadaDaTela[] = [
  {
    id: id(31),
    origem: "conversa",
    titulo: null,
    duracaoS: 2400,
    recebidaEm: "2026-11-11T22:10:00Z",
    frase: "Guardada. Esperando os outros áudios do envio.",
    confirmar: false,
  },
];
