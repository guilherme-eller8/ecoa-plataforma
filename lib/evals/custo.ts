// Evals 1A: definições de custo e tempo, puras (sem banco). As linhas vêm somadas pelo banco
// (admin_uso_por_dia, admin_primeira_palavra); aqui só se divide, agrupa e projeta.
import {
  EVALS_AMOSTRA_MIN,
  EVALS_TROCAS_PROJECAO,
  PREMISSA_HISTORIAS_POR_LIVRO,
  PREMISSA_MIN_AUDIO_POR_HISTORIA,
} from "@/lib/config";

export type LinhaUso = {
  dia: string; // AAAA-MM-DD, Brasília
  etapa: string;
  modelo: string;
  chamadas: number;
  falhas: number;
  repetidas: number;
  custo_usd: number;
  custo_falhas_usd: number;
  minutos_audio: number;
  tokens_entrada: number;
  tokens_saida: number;
  tokens_cache_lido: number;
  tokens_cache_gravado: number;
};

/** Uma taxa sempre com a contagem; abaixo da amostra mínima não vira percentual. */
export type Taxa = { n: number; de: number; fracao: number | null };

export function taxa(n: number, de: number, minimo = EVALS_AMOSTRA_MIN): Taxa {
  return { n, de, fracao: de >= minimo && de > 0 ? n / de : null };
}

/** Grupos de etapa mostrados nas barras (ordem = ordem da pilha). */
export const GRUPOS = [
  "transcricao",
  "escrita",
  "pedidos",
  "divisao",
  "outras",
] as const;
export type Grupo = (typeof GRUPOS)[number];

const GRUPO_DA_ETAPA: Record<string, Grupo> = {
  transcrever: "transcricao",
  estruturar: "escrita",
  editar: "escrita",
  verificar: "escrita",
  memoria: "escrita",
  tamanho: "pedidos",
  revisar: "pedidos",
  integrar: "pedidos",
  dividir: "divisao",
};

export function grupoDaEtapa(etapa: string): Grupo {
  return GRUPO_DA_ETAPA[etapa] ?? "outras";
}

const soma = (linhas: readonly LinhaUso[], f: (l: LinhaUso) => number) =>
  linhas.reduce((t, l) => t + f(l), 0);

export type ResumoDeCusto = {
  gastoUSD: number;
  chamadas: number;
  /** Minutos de áudio transcritos (etapa transcrever). */
  minutos: number;
  /** Gasto total (com trocas, pedidos e falhas) por minuto de áudio. */
  porMinutoUSD: number | null;
  porHistoriaUSD: number | null;
  /** Custo das chamadas que falharam, sobre o gasto. A repetição que deu certo já está na linha. */
  perda: { usd: number; fracao: number | null };
  /** Chamadas que precisaram de mais de uma tentativa (contadas, não somadas à parte). */
  repetidas: number;
  trocasTamanhoUSD: number;
  /** Fração dos tokens de entrada servida pelo cache. */
  cache: number | null;
};

export function resumoDeCusto(
  linhas: readonly LinhaUso[],
  historias: number,
): ResumoDeCusto {
  const gasto = soma(linhas, (l) => l.custo_usd);
  const minutos = soma(linhas, (l) =>
    l.etapa === "transcrever" ? l.minutos_audio : 0,
  );
  const perdaUSD = soma(linhas, (l) => l.custo_falhas_usd);
  const entradaTotal = soma(
    linhas,
    (l) => l.tokens_entrada + l.tokens_cache_lido + l.tokens_cache_gravado,
  );
  return {
    gastoUSD: gasto,
    chamadas: soma(linhas, (l) => l.chamadas),
    minutos,
    porMinutoUSD: minutos > 0 ? gasto / minutos : null,
    porHistoriaUSD: historias > 0 ? gasto / historias : null,
    perda: { usd: perdaUSD, fracao: gasto > 0 ? perdaUSD / gasto : null },
    repetidas: soma(linhas, (l) => l.repetidas),
    trocasTamanhoUSD: soma(linhas, (l) =>
      l.etapa === "tamanho" ? l.custo_usd : 0,
    ),
    cache:
      entradaTotal > 0
        ? soma(linhas, (l) => l.tokens_cache_lido) / entradaTotal
        : null,
  };
}

/** Segunda-feira (AAAA-MM-DD) da semana de um dia AAAA-MM-DD. */
export function segundaDe(dia: string): string {
  const t = new Date(`${dia}T12:00:00Z`);
  const desde = (t.getUTCDay() + 6) % 7; // segunda = 0
  return new Date(t.getTime() - desde * 24 * 3600_000)
    .toISOString()
    .slice(0, 10);
}

export type SemanaDeGasto = { semana: string } & Record<Grupo, number>;

/** Gasto por semana e grupo de etapa, as `semanas` mais recentes até `hoje` (inclusive). */
export function gastoPorSemana(
  linhas: readonly LinhaUso[],
  hoje: string,
  semanas: number,
): SemanaDeGasto[] {
  const ultima = segundaDe(hoje);
  const lista: SemanaDeGasto[] = Array.from({ length: semanas }, (_, i) => {
    const semana = new Date(
      Date.parse(`${ultima}T12:00:00Z`) - (semanas - 1 - i) * 7 * 24 * 3600_000,
    )
      .toISOString()
      .slice(0, 10);
    return {
      semana,
      transcricao: 0,
      escrita: 0,
      pedidos: 0,
      divisao: 0,
      outras: 0,
    };
  });
  const porSemana = new Map(lista.map((s) => [s.semana, s]));
  for (const l of linhas) {
    const s = porSemana.get(segundaDe(l.dia));
    if (s) s[grupoDaEtapa(l.etapa)] += l.custo_usd;
  }
  return lista;
}

export type LinhaDeProjecao = { trocas: number; livroUSD: number };

/**
 * Custo de IA de um livro (premissas de lib/config.ts: histórias × minutos) a partir do custo
 * medido por minuto, só das chamadas que deram certo. Cada troca de tamanho refaz a edição e a
 * verificação (T11); transcrição, estruturação e memória acontecem uma vez.
 * Sem minutos medidos, não há projeção.
 */
export function projetarPorHabito(
  linhas: readonly LinhaUso[],
): LinhaDeProjecao[] | null {
  const minutos = soma(linhas, (l) =>
    l.etapa === "transcrever" ? l.minutos_audio : 0,
  );
  if (minutos <= 0) return null;
  const porMin = (etapas: string[]) =>
    soma(linhas, (l) =>
      etapas.includes(l.etapa) ? l.custo_usd - l.custo_falhas_usd : 0,
    ) / minutos;
  const fixo = porMin(["transcrever", "estruturar", "memoria"]);
  const porGeracao = porMin(["editar", "verificar"]);
  const minutosLivro =
    PREMISSA_HISTORIAS_POR_LIVRO * PREMISSA_MIN_AUDIO_POR_HISTORIA;
  return EVALS_TROCAS_PROJECAO.map((trocas) => ({
    trocas,
    livroUSD: minutosLivro * (fixo + porGeracao * (1 + trocas)),
  }));
}

export type FaixaDeEspera = {
  faixa: number;
  esperas: number;
  p50_ms: number | null;
  p95_ms: number | null;
  paradas: number;
};

/** Rótulo de cada faixa a partir dos limites (em minutos), na ordem do banco (width_bucket). */
export function rotulosDasFaixas(limites: readonly number[]): string[] {
  return [
    `até ${limites[0]} min`,
    ...limites.slice(1).map((l, i) => `${limites[i]} a ${l} min`),
    `${limites[limites.length - 1]} min ou mais`,
  ];
}

/** Todas as faixas, com zero onde o banco não devolveu linha. */
export function faixasCompletas(
  linhas: readonly FaixaDeEspera[],
  limites: readonly number[],
): (FaixaDeEspera & { rotulo: string })[] {
  return rotulosDasFaixas(limites).map((rotulo, faixa) => {
    const l = linhas.find((x) => x.faixa === faixa);
    return {
      faixa,
      rotulo,
      esperas: l?.esperas ?? 0,
      p50_ms: l?.p50_ms ?? null,
      p95_ms: l?.p95_ms ?? null,
      paradas: l?.paradas ?? 0,
    };
  });
}

export type FalhaLida = { etapa: string; erro_codigo: string | null };

/** Falhas por código, da mais frequente para a menos. */
export function falhasPorCodigo(
  falhas: readonly FalhaLida[],
): { codigo: string; etapa: string; vezes: number }[] {
  const mapa = new Map<
    string,
    { codigo: string; etapa: string; vezes: number }
  >();
  for (const f of falhas) {
    const codigo = f.erro_codigo ?? "sem_codigo";
    const chave = `${f.etapa}:${codigo}`;
    const c = mapa.get(chave) ?? { codigo, etapa: f.etapa, vezes: 0 };
    c.vezes++;
    mapa.set(chave, c);
  }
  return [...mapa.values()].sort(
    (a, b) => b.vezes - a.vezes || a.codigo.localeCompare(b.codigo),
  );
}
