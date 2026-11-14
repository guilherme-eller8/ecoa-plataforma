// Dados falsos do prompt 11 para o styleguide (gate de design).
import type { AcoesGrupo } from "@/components/editor/folha-grupo";
import type { EstadoCompartilhada } from "@/lib/compartilhar/tipos";
import type {
  AcoesPessoas,
  ConviteDaTela,
  LivroDaTela,
  MembroDaTela,
  PerguntaDaTela,
} from "@/lib/livro/tipos";
import { LIVRO_JAIR, PERGUNTAS_JAIR } from "./prompt4";

const ok = async () => ({ ok: true as const });

export const LIVRO_COFACILITADORA: LivroDaTela = {
  ...LIVRO_JAIR,
  ehResponsavel: false,
};

export const LIVRO_NOVO_RESPONSAVEL: LivroDaTela = {
  ...LIVRO_JAIR,
  configuracao: { quem: "feito", perguntas: "feito", fotos: "pulado" },
};

export const MEMBROS_JAIR: MembroDaTela[] = [
  {
    userId: "00000000-0000-4000-8000-000000001101",
    papel: "responsavel",
    nome: "Guilherme Souza",
    email: "guilherme@exemplo.com",
    ehVoce: true,
  },
  {
    userId: "00000000-0000-4000-8000-000000001102",
    papel: "cofacilitador",
    nome: "Beatriz Souza",
    email: "beatriz@exemplo.com",
    ehVoce: false,
  },
];

export const MEMBROS_VISTOS_PELA_BIA: MembroDaTela[] = MEMBROS_JAIR.map(
  (m) => ({ ...m, ehVoce: m.papel === "cofacilitador" }),
);

export const CONVITES_JAIR: ConviteDaTela[] = [
  {
    id: "00000000-0000-4000-8000-000000001201",
    email: "rafael@exemplo.com",
    expiraEm: "2026-11-21T12:00:00Z",
    mensagem:
      "Estou fazendo o livro de memórias de Vô Jair e quero sua ajuda.\n\nMandei um convite para o seu e-mail. Entre com ele por este link:\n\nhttps://app.ecoa-memorias.com.br/convite/v1_exemplo",
  },
];

export const ACOES_PESSOAS_FALSAS: AcoesPessoas = {
  convidar: async (email) => ({
    ok: true,
    dados: {
      convite: { ...CONVITES_JAIR[0], id: crypto.randomUUID(), email },
    },
  }),
  cancelarConvite: ok,
  remover: ok,
  sair: ok,
  trocarLinks: ok,
};

export const ACOES_GRUPO_FALSAS: AcoesGrupo = {
  compartilhar: async () => ({
    ok: true,
    dados: {
      url: "https://app.ecoa-memorias.com.br/o/v1_exemplo",
      comVoz: true,
      mensagem:
        'Vô Jair contou: "O trem para Guarapari". Ouça na voz dele e leia aqui: https://app.ecoa-memorias.com.br/o/v1_exemplo',
    },
  }),
  desligar: ok,
};

const TEXTO_TREM = [
  "Eu tinha onze anos quando peguei o trem para Guarapari pela primeira vez. Minha mãe acordou a gente antes do sol, com o café já passado e o pão embrulhado num pano de prato.",
  "O vagão cheirava a carvão e a laranja. Meu irmão ficou na janela o caminho inteiro, contando as pontes, e eu fingia que não estava com medo dos túneis.",
  "Quando vi o mar pela primeira vez, fiquei parado na areia sem saber o que fazer. Meu pai riu e disse que o mar não ia fugir.",
];

export const COMPARTILHADA: EstadoCompartilhada = {
  estado: "ok",
  autor: "Vô Jair",
  titulo: "O trem para Guarapari",
  ano: 1962,
  paragrafos: TEXTO_TREM,
  voz: { tipo: "ok", audioUrl: "data:audio/mp4;base64," },
};

export const COMPARTILHADA_PREPARANDO: EstadoCompartilhada = {
  ...COMPARTILHADA,
  voz: { tipo: "preparando" },
};

export const PERGUNTAS_PARA_LEMBRAR: PerguntaDaTela[] = PERGUNTAS_JAIR.map(
  (p) => (p.estado === "enviada" ? { ...p, podeLembrar: true } : p),
);
