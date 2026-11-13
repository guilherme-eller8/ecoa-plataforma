// Dados falsos do prompt 9 (IA sob controle) para a vitrine e os testes de tela.
import type { Paragrafo } from "@/lib/editor/conteudo";
import {
  comporProposta,
  mudancaDeTrecho,
  mudancasDeAudio,
  mudancasDeTamanho,
} from "@/lib/editor/propostas";
import type {
  AcoesEditor,
  AcoesPropostas,
  PropostaDaTela,
} from "@/lib/editor/tipos";
import type { HistoriaParaEditar } from "@/lib/historias/tipos";
import { HISTORIA_PARA_EDITAR, acoesEditorFalsas } from "./prompt8";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// O 2º parágrafo já foi editado à mão: ele fica travado em toda proposta.
const PARAGRAFOS: Paragrafo[] = HISTORIA_PARA_EDITAR.texto.paragrafos.map(
  (p) =>
    p.id === "p2"
      ? {
          ...p,
          texto:
            "Não deu certo. Cheguei e o homem da oficina falou que a vaga já era de outro. Dormi na rodoviária, com a mala de travesseiro.",
          editado: true,
        }
      : p,
);

export const HISTORIA_EDITADA: HistoriaParaEditar = {
  ...HISTORIA_PARA_EDITAR,
  texto: { ...HISTORIA_PARA_EDITAR.texto, paragrafos: PARAGRAFOS },
  marcacoes: [],
  rev: 1,
};

let n = 0;
const gerarId = () => `n-${++n}`;

const tamanho = mudancasDeTamanho(
  PARAGRAFOS,
  [
    {
      texto:
        "Eu tinha dezoito anos quando peguei o trem em Cachoeiro, ainda escuro, com uma mala de papelão e um pão com mortadela que a mãe fez. Ia para Vitória procurar serviço, sem conhecer ninguém lá.",
      fontes: [2, 3, 4],
    },
    { travado: "p2" },
    {
      texto:
        "No outro dia o Tião, meu primo, me arrumou um bico de ajudante de pedreiro. Fiquei três anos lá, carregando massa e aprendendo o serviço.",
      fontes: [8],
    },
  ],
  gerarId,
);

export const PROPOSTA_TAMANHO: PropostaDaTela = {
  id: "77777777-7777-4777-8777-777777777771",
  tipo: "tamanho",
  estado: "pronta",
  tamanho: "longo",
  pedido: {},
  mudancas: tamanho.mudancas,
  ordem: tamanho.ordem,
  marcacoes: [],
  erro: null,
  pedidaEm: "2026-11-13T18:00:00Z",
};

export const PROPOSTA_AUDIO: PropostaDaTela = {
  id: "77777777-7777-4777-8777-777777777772",
  tipo: "audio",
  estado: "pronta",
  tamanho: "medio",
  pedido: {},
  mudancas: mudancasDeAudio(
    PARAGRAFOS,
    [
      {
        tipo: "inserir",
        alvo: "p3",
        paragrafos: [
          {
            texto:
              "Depois de três anos voltei para Cachoeiro de trem, dessa vez com dinheiro no bolso.",
            fontes: [9],
          },
        ],
      },
    ],
    gerarId,
  ),
  ordem: null,
  marcacoes: [],
  erro: null,
  pedidaEm: "2026-11-13T18:10:00Z",
};

export const HISTORIA_COM_PROPOSTA: HistoriaParaEditar = {
  ...HISTORIA_EDITADA,
  propostas: [PROPOSTA_TAMANHO],
};

/** Ações falsas das propostas: o tamanho fica pronto na 1ª consulta; o aceite compõe aqui. */
export function acoesPropostasFalsas(): AcoesPropostas {
  let atual = PARAGRAFOS;
  let pendentes: PropostaDaTela[] = [];
  const aceitar = (p: PropostaDaTela, aceitas: string[]) => {
    const r = comporProposta(atual, [], p, aceitas);
    atual = r.paragrafos;
    pendentes = pendentes.filter((x) => x.id !== p.id);
    return r;
  };
  const todas = () => [PROPOSTA_TAMANHO, PROPOSTA_AUDIO, ...pendentes];
  return {
    async pedirTamanho(_aba, t) {
      await espera(150);
      const p: PropostaDaTela = {
        ...PROPOSTA_TAMANHO,
        id: "77777777-7777-4777-8777-777777777773",
        tamanho: t,
        estado: "gerando",
      };
      pendentes = [...pendentes.filter((x) => x.tipo !== "tamanho"), p];
      return { ok: true, dados: p };
    },
    async revisarTrecho(_aba, pedido) {
      await espera(400);
      const alvo = atual.find((x) => x.id === pedido.paragrafo);
      if (!alvo)
        return { ok: false, mensagem: "O texto mudou depois do pedido." };
      const p: PropostaDaTela = {
        id: "77777777-7777-4777-8777-777777777774",
        tipo: "trecho",
        estado: "pronta",
        tamanho: "medio",
        pedido: { paragrafo: alvo.id },
        mudancas: mudancaDeTrecho(
          alvo,
          pedido.inicio,
          pedido.fim,
          "cedinho",
          gerarId,
        ),
        ordem: null,
        marcacoes: [],
        erro: null,
        pedidaEm: new Date().toISOString(),
      };
      pendentes = [...pendentes.filter((x) => x.tipo !== "trecho"), p];
      return { ok: true, dados: p };
    },
    async usarAudio() {
      return { ok: true, dados: PROPOSTA_AUDIO };
    },
    async pendentes() {
      await espera(80);
      pendentes = pendentes.map((p) =>
        p.estado === "gerando" ? { ...p, estado: "pronta" } : p,
      );
      return { ok: true, dados: pendentes };
    },
    async aplicarProposta(_aba, rev, id, aceitas) {
      await espera(250);
      const p = todas().find((x) => x.id === id);
      if (!p) return { ok: false, mensagem: "Esta proposta já foi decidida." };
      const r = aceitar(p, aceitas);
      return {
        ok: true,
        dados: {
          rev: rev + 1,
          paragrafos: r.paragrafos,
          marcacoes: r.marcacoes,
        },
      };
    },
    async descartarProposta(_aba, id) {
      pendentes = pendentes.filter((x) => x.id !== id);
      return { ok: true };
    },
    audios: {
      async prepararAudios() {
        await espera(100);
        return {
          ok: true,
          dados: [
            {
              id: "88888888-8888-4888-8888-888888888881",
              caminho: "livros/x/audios/y.m4a",
              token: "t",
              contentType: "audio/mp4",
            },
          ],
        };
      },
      async reassinarAudio() {
        return { ok: false, mensagem: "Não deu certo agora." };
      },
      async confirmarAudio() {
        return { ok: true };
      },
    },
  };
}

export function acoesEditorComIA(): AcoesEditor {
  return { ...acoesEditorFalsas(), propostas: acoesPropostasFalsas() };
}
