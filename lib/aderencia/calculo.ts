// Aderência (prompt 15): funções puras sobre events, sem banco. Só ids e contagens (T23).
import {
  ADERENCIA_DIAS_ACESSO,
  ADERENCIA_SEMANAS,
  LIVRO_PARADO_DIAS,
} from "@/lib/config";

export type EventoLinha = {
  criado_em: string;
  book_id: string | null;
  ator_tipo: string;
  ator_id: string | null;
  acao: string;
};

export type LivroEntrada = {
  id: string;
  autorNome: string | null;
  criadoEm: string;
  /** Histórias com estado `pronta`. */
  prontas: number;
  /** Histórias com `revisada_em` preenchido. */
  revisadas: number;
};

/** Quem conta como "pessoa": sistema e admin não mantêm o livro vivo. */
const PESSOAS = new Set(["responsavel", "cofacilitador", "autor", "familia"]);
const DIA_MS = 24 * 3600_000;

/** Os 5 passos da M11, na ordem. */
export const PASSOS_ONBOARDING = [
  "Dizer quem é o autor",
  "Abrir a enquete no grupo",
  "Enviar a 1ª pergunta ou gravar",
  "Ver a 1ª história nascer",
  "Revisar e marcar como pronta",
] as const;

/** Dia de Brasília (UTC-3, sem horário de verão) como AAAA-MM-DD. */
export function diaBrasilia(iso: string | Date): string {
  const t = typeof iso === "string" ? new Date(iso) : iso;
  return new Date(t.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
}

/** Meia-noite de Brasília do dia `dia` (AAAA-MM-DD), em ms UTC. */
function inicioDoDia(dia: string): number {
  return Date.parse(`${dia}T03:00:00.000Z`);
}

export type PassoDoLivro = {
  /** Quantos dos 5 passos estão feitos, na ordem (o livro está no primeiro que falta). */
  feitos: number;
  /** Índice do passo em que o livro está, ou null com os 5 feitos. */
  atual: number | null;
};

/** O livro está no primeiro passo que falta: P48, calculado dos dados, sem banco novo. */
export function passoDoLivro(
  livro: LivroEntrada,
  eventos: readonly EventoLinha[],
): PassoDoLivro {
  const tem = (...acoes: string[]) =>
    eventos.some((e) => acoes.includes(e.acao));
  const feito = [
    Boolean(livro.autorNome?.trim()),
    tem("abriu_enquete"),
    tem("enviou_pergunta", "gravou", "subiu_audio"),
    livro.prontas >= 1,
    livro.revisadas >= 1,
  ];
  const falta = feito.indexOf(false);
  return {
    feitos: falta === -1 ? feito.length : falta,
    atual: falta === -1 ? null : falta,
  };
}

export type SemanaDeGravacoes = { autor: number; membros: number };

/**
 * Gravações por semana, da mais recente para a mais antiga. Semana 0 = os últimos 7 dias
 * (de agora para trás), semana 1 = os 7 anteriores. `subiu_audio` conta como gravação de
 * membro: é áudio que entrou no livro.
 */
export function gravacoesPorSemana(
  eventos: readonly EventoLinha[],
  agora: Date,
  semanas: number = ADERENCIA_SEMANAS,
): SemanaDeGravacoes[] {
  const saida = Array.from({ length: semanas }, () => ({
    autor: 0,
    membros: 0,
  }));
  for (const e of eventos) {
    if (e.acao !== "gravou" && e.acao !== "subiu_audio") continue;
    const i = Math.floor(
      (agora.getTime() - Date.parse(e.criado_em)) / (7 * DIA_MS),
    );
    if (i < 0 || i >= semanas) continue;
    if (e.ator_tipo === "autor") saida[i].autor++;
    else saida[i].membros++;
  }
  return saida;
}

/** Quando uma pessoa agiu pela última vez no livro, ou null. */
export function ultimaAcaoDePessoa(
  eventos: readonly EventoLinha[],
): string | null {
  let ultimo: string | null = null;
  for (const e of eventos) {
    if (!PESSOAS.has(e.ator_tipo)) continue;
    if (!ultimo || e.criado_em > ultimo) ultimo = e.criado_em;
  }
  return ultimo;
}

export type LinhaDeAderencia = {
  id: string;
  autorNome: string | null;
  passo: PassoDoLivro;
  /** Dias inteiros desde a última ação de pessoa (ou desde a criação do livro). */
  paradoHaDias: number;
  parado: boolean;
  /** Algum evento do autor (abriu o link, consentiu, gravou). */
  autorApareceu: boolean;
  autorGravou: boolean;
  semanas: SemanaDeGravacoes[];
  configurou: boolean;
};

export function linhaDoLivro(
  livro: LivroEntrada,
  eventos: readonly EventoLinha[],
  agora: Date,
): LinhaDeAderencia {
  const ultima = ultimaAcaoDePessoa(eventos) ?? livro.criadoEm;
  const paradoHaDias = Math.max(
    0,
    Math.floor((agora.getTime() - Date.parse(ultima)) / DIA_MS),
  );
  return {
    id: livro.id,
    autorNome: livro.autorNome,
    passo: passoDoLivro(livro, eventos),
    paradoHaDias,
    parado: paradoHaDias >= LIVRO_PARADO_DIAS,
    autorApareceu: eventos.some((e) => e.ator_tipo === "autor"),
    autorGravou: eventos.some(
      (e) => e.ator_tipo === "autor" && e.acao === "gravou",
    ),
    semanas: gravacoesPorSemana(eventos, agora),
    configurou: eventos.some((e) => e.acao === "configurou"),
  };
}

export type Funil = {
  livros: number;
  configurou: number;
  primeiraHistoria: number;
  cincoHistorias: number;
  /** null até o prompt 13 (publicação) existir. */
  publicado: number | null;
};

export function funil(
  livros: readonly LivroEntrada[],
  linhas: readonly LinhaDeAderencia[],
): Funil {
  return {
    livros: livros.length,
    configurou: linhas.filter((l) => l.configurou).length,
    primeiraHistoria: livros.filter((l) => l.prontas >= 1).length,
    cincoHistorias: livros.filter((l) => l.prontas >= 5).length,
    publicado: null,
  };
}

/** Do mais parado para o menos; empate pelo nome. */
export function ordenarPorParado(
  linhas: readonly LinhaDeAderencia[],
): LinhaDeAderencia[] {
  return [...linhas].sort(
    (a, b) =>
      b.paradoHaDias - a.paradoHaDias ||
      (a.autorNome ?? "").localeCompare(b.autorNome ?? "", "pt-BR"),
  );
}

// ── Página de um livro ───────────────────────────────────────────────────

export type ChavePessoa = string; // `${ator_tipo}:${ator_id ?? ""}`

export const chaveDaPessoa = (e: Pick<EventoLinha, "ator_tipo" | "ator_id">) =>
  `${e.ator_tipo}:${e.ator_id ?? ""}`;

export type AcessosDaPessoa = {
  chave: ChavePessoa;
  papel: string;
  atorId: string | null;
  /** AAAA-MM-DD de Brasília em que `entrou` foi registrado, só dentro da janela. */
  dias: string[];
  ultimo: string | null;
};

/**
 * Acessos por dia por pessoa nos últimos `ADERENCIA_DIAS_ACESSO` dias (inclui hoje).
 * "Acesso" = evento `entrou` (membro, 1 por dia; autor, 1 por dia) — família não tem
 * identidade e fica fora.
 */
export function acessosPorPessoa(
  eventos: readonly EventoLinha[],
  agora: Date,
  dias: number = ADERENCIA_DIAS_ACESSO,
): AcessosDaPessoa[] {
  const hoje = diaBrasilia(agora);
  const corte = inicioDoDia(hoje) - (dias - 1) * DIA_MS;
  const mapa = new Map<ChavePessoa, AcessosDaPessoa>();
  for (const e of eventos) {
    if (e.acao !== "entrou") continue;
    const t = Date.parse(e.criado_em);
    const chave = chaveDaPessoa(e);
    const p = mapa.get(chave) ?? {
      chave,
      papel: e.ator_tipo,
      atorId: e.ator_id,
      dias: [],
      ultimo: null,
    };
    if (!p.ultimo || e.criado_em > p.ultimo) p.ultimo = e.criado_em;
    if (t >= corte) {
      const d = diaBrasilia(e.criado_em);
      if (!p.dias.includes(d)) p.dias.push(d);
    }
    mapa.set(chave, p);
  }
  return [...mapa.values()]
    .map((p) => ({ ...p, dias: p.dias.sort().reverse() }))
    .sort((a, b) => (b.ultimo ?? "").localeCompare(a.ultimo ?? ""));
}
