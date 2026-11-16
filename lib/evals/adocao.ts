// Evals 1A: definições de adoção, puras (sem banco). Decisão em docs/decisoes.md (T55).
// Livro ativo conta ações de criação de quem tem identidade no livro (responsável,
// co-facilitador, autor); "entrou" e eventos da família não contam, porque o link da família
// não tem login: conta-se ação por livro, nunca "pessoa distinta".
import {
  ACOES_DE_CRIACAO,
  ATIVACAO_DIAS,
  RETENCAO_SEMANAS,
} from "@/lib/config";
import { diaBrasilia } from "@/lib/aderencia/calculo";
import { segundaDe, taxa, type Taxa } from "./custo";

const DIA_MS = 24 * 3600_000;
const SEMANA_MS = 7 * DIA_MS;
const QUEM_CRIA = new Set(["responsavel", "cofacilitador", "autor"]);
const CRIACAO = new Set<string>(ACOES_DE_CRIACAO);

export type EventoDeAdocao = {
  criado_em: string;
  book_id: string | null;
  ator_tipo: string;
  acao: string;
};

export type LivroDeAdocao = { id: string; ativadoEm: string | null };

export function ehCriacao(e: EventoDeAdocao): boolean {
  return CRIACAO.has(e.acao) && QUEM_CRIA.has(e.ator_tipo);
}

const ms = (iso: string) => Date.parse(iso);
const ativados = (livros: readonly LivroDeAdocao[], agora: Date) =>
  livros.filter(
    (l): l is { id: string; ativadoEm: string } =>
      l.ativadoEm !== null && ms(l.ativadoEm) <= agora.getTime(),
  );

/** Livros com 1 ou mais ações de criação nos últimos 7 dias, sobre os livros ativados. */
export function livrosAtivos(
  livros: readonly LivroDeAdocao[],
  eventos: readonly EventoDeAdocao[],
  agora: Date,
): Taxa {
  const base = ativados(livros, agora);
  const ids = new Set(base.map((l) => l.id));
  const desde = agora.getTime() - SEMANA_MS;
  const ativos = new Set(
    eventos
      .filter(
        (e) =>
          e.book_id &&
          ids.has(e.book_id) &&
          ms(e.criado_em) > desde &&
          ehCriacao(e),
      )
      .map((e) => e.book_id),
  );
  return taxa(ativos.size, base.length);
}

/**
 * Ativação: 1ª história revisada em até ATIVACAO_DIAS do plano ativado. Só entram os livros
 * cujo prazo já acabou; os mais novos ficam em `emAndamento`.
 */
export function ativacao(
  livros: readonly LivroDeAdocao[],
  primeiraRevisada: ReadonlyMap<string, string>,
  agora: Date,
): { taxa: Taxa; emAndamento: number } {
  const prazo = ATIVACAO_DIAS * DIA_MS;
  const base = ativados(livros, agora);
  const vencidos = base.filter(
    (l) => ms(l.ativadoEm) + prazo <= agora.getTime(),
  );
  const ativadosNoPrazo = vencidos.filter((l) => {
    const r = primeiraRevisada.get(l.id);
    return r !== undefined && ms(r) - ms(l.ativadoEm) <= prazo;
  });
  return {
    taxa: taxa(ativadosNoPrazo.length, vencidos.length),
    emAndamento: base.length - vencidos.length,
  };
}

export type Coorte = {
  /** Segunda-feira (Brasília) da semana em que o plano foi ativado. */
  semana: string;
  livros: number;
  /** Semana 1..RETENCAO_SEMANAS depois da ativação; null enquanto nenhum livro chegou lá. */
  semanas: (Taxa | null)[];
};

/**
 * Retenção por coorte: livros da coorte ativos na semana N (dias 7N a 7N+6 depois da ativação),
 * sobre os livros da coorte que já viveram a semana N inteira.
 */
export function retencaoPorCoorte(
  livros: readonly LivroDeAdocao[],
  eventos: readonly EventoDeAdocao[],
  agora: Date,
): Coorte[] {
  const criacoes = new Map<string, number[]>();
  for (const e of eventos)
    if (e.book_id && ehCriacao(e)) {
      const lista = criacoes.get(e.book_id) ?? [];
      lista.push(ms(e.criado_em));
      criacoes.set(e.book_id, lista);
    }
  const coortes = new Map<string, { id: string; ativadoEm: string }[]>();
  for (const l of ativados(livros, agora)) {
    const semana = segundaDe(diaBrasilia(l.ativadoEm));
    coortes.set(semana, [...(coortes.get(semana) ?? []), l]);
  }
  return [...coortes.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([semana, lista]) => ({
      semana,
      livros: lista.length,
      semanas: Array.from({ length: RETENCAO_SEMANAS }, (_, i) => {
        const n = i + 1;
        const elegiveis = lista.filter(
          (l) => ms(l.ativadoEm) + (n + 1) * SEMANA_MS <= agora.getTime(),
        );
        if (elegiveis.length === 0) return null;
        const ativos = elegiveis.filter((l) => {
          const de = ms(l.ativadoEm) + n * SEMANA_MS;
          return (criacoes.get(l.id) ?? []).some(
            (t) => t >= de && t < de + SEMANA_MS,
          );
        });
        return taxa(ativos.length, elegiveis.length);
      }),
    }));
}

/** Mediana, em horas, do plano ativado à 1ª história pronta (só livros que já têm uma). */
export function horasAtePrimeiraPronta(
  livros: readonly LivroDeAdocao[],
  primeiraPronta: ReadonlyMap<string, string>,
): { mediana: number | null; n: number } {
  const horas = livros
    .flatMap((l) => {
      const p = primeiraPronta.get(l.id);
      return l.ativadoEm && p
        ? [Math.max(0, ms(p) - ms(l.ativadoEm)) / 3600_000]
        : [];
    })
    .sort((a, b) => a - b);
  if (horas.length === 0) return { mediana: null, n: 0 };
  const m = Math.floor(horas.length / 2);
  return {
    mediana: horas.length % 2 ? horas[m] : (horas[m - 1] + horas[m]) / 2,
    n: horas.length,
  };
}

/** Ações de criação por papel nos últimos `dias`: quem mantém o livro vivo. */
export function quemMantem(
  eventos: readonly EventoDeAdocao[],
  agora: Date,
  dias: number,
): { papel: string; acoes: number }[] {
  const desde = agora.getTime() - dias * DIA_MS;
  const conta = new Map<string, number>(
    [...QUEM_CRIA].map((p) => [p, 0] as const),
  );
  for (const e of eventos)
    if (ms(e.criado_em) > desde && ehCriacao(e))
      conta.set(e.ator_tipo, (conta.get(e.ator_tipo) ?? 0) + 1);
  return [...conta.entries()].map(([papel, acoes]) => ({ papel, acoes }));
}

/** O que o produto entregou nos últimos `dias`, contado nos eventos. */
export function valorEntregue(
  eventos: readonly EventoDeAdocao[],
  agora: Date,
  dias: number,
): {
  revisadas: number;
  publicados: number;
  qrTocados: number;
  compartilhadas: number;
} {
  const desde = agora.getTime() - dias * DIA_MS;
  const recentes = eventos.filter((e) => ms(e.criado_em) > desde);
  const conta = (acao: string) =>
    recentes.filter((e) => e.acao === acao).length;
  return {
    revisadas: conta("historia_revisada"),
    publicados: conta("livro_publicado"),
    qrTocados: conta("qr_tocou"),
    compartilhadas: conta("compartilhada_tocada"),
  };
}

/** Primeiro instante por livro (menor ISO). */
export function primeiroPorLivro(
  linhas: readonly { book_id: string; em: string | null }[],
): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const l of linhas) {
    if (!l.em) continue;
    const atual = mapa.get(l.book_id);
    if (!atual || ms(l.em) < ms(atual)) mapa.set(l.book_id, l.em);
  }
  return mapa;
}
