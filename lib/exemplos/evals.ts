// Exemplos da fase 1A de Evals para o styleguide (gate de design e e2e). Números inventados,
// com a ordem de grandeza da produção em 16/11/2026 (US$ 0,064 por história de 1 min 42).
import type { DadosAdocao } from "@/components/telas/tela-evals-adocao";
import type { DadosCusto } from "@/components/telas/tela-evals";
import type { LivroDaEscolha } from "@/components/telas/tela-inicio-admin";
import type { DadosDoCliente } from "@/lib/aderencia/dados";
import { FUNIL_ADERENCIA } from "./prompt15";

const semana = (
  s: string,
  escrita: number,
  transcricao: number,
  pedidos = 0,
) => ({
  semana: s,
  transcricao,
  escrita,
  pedidos,
  divisao: 0,
  outras: 0,
});

export const DADOS_CUSTO: DadosCusto = {
  dias: 30,
  historias: 7,
  resumo: {
    gastoUSD: 0.62,
    chamadas: 48,
    minutos: 14.5,
    porMinutoUSD: 0.62 / 14.5,
    porHistoriaUSD: 0.62 / 7,
    perda: { usd: 0.056, fracao: 0.056 / 0.62 },
    repetidas: 2,
    trocasTamanhoUSD: 0.08,
    cache: 0.41,
  },
  semanas: [
    semana("2026-10-26", 0, 0),
    semana("2026-11-02", 0, 0),
    semana("2026-11-09", 0.21, 0.035),
    semana("2026-11-16", 0.28, 0.06, 0.035),
    semana("2026-11-23", 0, 0),
    semana("2026-11-30", 0, 0),
    semana("2026-12-07", 0, 0),
    semana("2026-12-14", 0, 0),
  ],
  projecao: [
    { trocas: 0, livroUSD: 4.1 },
    { trocas: 0.5, livroUSD: 5.3 },
    { trocas: 1, livroUSD: 6.4 },
    { trocas: 2, livroUSD: 8.8 },
  ],
  faixas: [
    {
      faixa: 0,
      rotulo: "até 5 min",
      esperas: 6,
      p50_ms: 41_000,
      p95_ms: 78_000,
      paradas: 1,
    },
    {
      faixa: 1,
      rotulo: "5 a 20 min",
      esperas: 1,
      p50_ms: 132_000,
      p95_ms: 132_000,
      paradas: 0,
    },
    {
      faixa: 2,
      rotulo: "20 min ou mais",
      esperas: 0,
      p50_ms: null,
      p95_ms: null,
      paradas: 0,
    },
  ],
  falhas: [
    { codigo: "json_invalido", etapa: "editar", vezes: 3 },
    { codigo: "resposta_cortada", etapa: "estruturar", vezes: 1 },
  ],
};

export const DADOS_CUSTO_VAZIO: DadosCusto = {
  ...DADOS_CUSTO,
  historias: 0,
  resumo: {
    ...DADOS_CUSTO.resumo,
    gastoUSD: 0,
    chamadas: 0,
    minutos: 0,
    porMinutoUSD: null,
    porHistoriaUSD: null,
  },
};

export const DADOS_ADOCAO: DadosAdocao = {
  livros: 3,
  ativos: { n: 1, de: 3, fracao: null },
  ativacao: { taxa: { n: 1, de: 2, fracao: null }, emAndamento: 1 },
  primeiraPronta: { mediana: 31, n: 1 },
  retencaoS4: { n: 0, de: 0, fracao: null },
  coortes: [
    {
      semana: "2026-11-16",
      livros: 1,
      semanas: [null, null, null, null],
    },
    {
      semana: "2026-11-09",
      livros: 2,
      semanas: [{ n: 1, de: 2, fracao: null }, null, null, null],
    },
  ],
  funil: { ...FUNIL_ADERENCIA, publicado: 0 },
  quem: [
    { papel: "responsavel", acoes: 14 },
    { papel: "cofacilitador", acoes: 0 },
    { papel: "autor", acoes: 3 },
  ],
  valor: { revisadas: 1, publicados: 0, qrTocados: 2, compartilhadas: 0 },
  conversar: [
    {
      id: "00000000-0000-4000-8000-0000000000a1",
      autorNome: "Dona Lurdes",
      motivo: "Parado há 7 dias (7 ou mais sem ação)",
    },
  ],
};

export const DADOS_ADOCAO_VAZIA: DadosAdocao = {
  ...DADOS_ADOCAO,
  livros: 0,
  coortes: [],
  conversar: [],
};

export const CLIENTE_JAIR: DadosDoCliente = {
  criadoEm: "2026-11-09T13:00:00Z",
  plano: "ativo",
  ativadoEm: "2026-11-09T13:05:00Z",
  venceEm: "2027-11-09T13:05:00Z",
  consentiuIaEm: "2026-11-11T19:20:00Z",
  membros: 2,
  prontas: 5,
  revisadas: 1,
  custoUSD: 0.245,
  minutos: 3.45,
  chamadas: 24,
  falhas: 6,
};

export const LIVROS_DA_ESCOLHA: LivroDaEscolha[] = [
  {
    id: "00000000-0000-4000-8000-0000000000a2",
    nome: "Jair",
    papel: "responsavel",
  },
  { id: "aa11bb22", nome: "Dona Lurdes", papel: "cofacilitador" },
];
