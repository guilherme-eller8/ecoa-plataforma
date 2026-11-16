import "server-only";
// Evals 1A: a foto do momento para os alertas. Somas no banco (admin_uso_por_dia,
// admin_custos_por_livro, admin_cotas_24h); leitura de linhas só em conjuntos pequenos e já
// filtrados, sempre em blocos. Devolve só ids e números (T36: passa pelo Inngest).
import { diaBrasilia } from "@/lib/aderencia/calculo";
import { emReais } from "@/lib/ai/custo";
import {
  ALERTA_COTA_FRACAO,
  ALERTA_ERROS_JANELA_MIN,
  ALERTA_GASTO_LIVRO_BRL,
  FILA_PARADA_MIN,
  MAX_MINUTOS_IA_DIA,
} from "@/lib/config";
import { inicioDoDiaBrasilia, lerEventos } from "@/lib/eventos";
import { gravacoesOrfas } from "@/lib/pipeline/fila";
import { clienteAdmin, type ClienteAdmin } from "@/lib/supabase/admin";
import { lerEmBlocos } from "@/lib/supabase/paginar";
import type { FotoDosAlertas } from "./alertas";

const DIA_MS = 24 * 3600_000;

/** Soma por livro de uma coluna de ai_usage desde um instante, para poucos livros. */
async function somaPorLivro(
  db: ClienteAdmin,
  livros: string[],
  coluna: "custo_usd" | "minutos_audio",
  desde: string,
  etapa?: string,
): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (!livros.length) return mapa;
  const linhas = await lerEmBlocos<{
    book_id: string;
    custo_usd: number;
    minutos_audio: number | null;
  }>((de, ate) => {
    let q = db
      .from("ai_usage")
      .select("book_id, custo_usd, minutos_audio")
      .in("book_id", livros)
      .gte("criado_em", desde)
      .order("id")
      .range(de, ate);
    if (etapa) q = q.eq("etapa", etapa);
    return q;
  }, 100_000);
  for (const l of linhas)
    mapa.set(l.book_id, (mapa.get(l.book_id) ?? 0) + Number(l[coluna] ?? 0));
  return mapa;
}

/** Gravações paradas: a varredura já reenviou, nada começou, e não é a cota diária adiando. */
async function filaParada(db: ClienteAdmin, agora: Date) {
  const orfas = await gravacoesOrfas(db, agora.getTime(), FILA_PARADA_MIN);
  if (!orfas.length) return [];
  const minutos24h = await somaPorLivro(
    db,
    [...new Set(orfas.map((g) => g.book_id))],
    "minutos_audio",
    new Date(agora.getTime() - DIA_MS).toISOString(),
    "transcrever",
  );
  return orfas
    .filter(
      (g) =>
        (minutos24h.get(g.book_id) ?? 0) + (g.duracao_s ?? 0) / 60 <=
        MAX_MINUTOS_IA_DIA,
    )
    .map((g) => ({
      id: g.id,
      book_id: g.book_id,
      esperaMin:
        (agora.getTime() - Date.parse(g.recebido_em ?? agora.toISOString())) /
        60_000,
    }));
}

/** erro_servidor contado por rota-padrão (a rota nunca leva token: instrumentation.ts). */
function porRota(eventos: { detalhes: unknown }[]) {
  const n = new Map<string, number>();
  for (const e of eventos) {
    const rota = (e.detalhes as { rota?: unknown } | null)?.rota;
    const chave = typeof rota === "string" ? rota.slice(0, 80) : "?";
    n.set(chave, (n.get(chave) ?? 0) + 1);
  }
  return [...n]
    .map(([rota, total]) => ({ rota, n: total }))
    .sort((a, b) => b.n - a.n);
}

export async function fotoDosAlertas(
  agora: Date = new Date(),
): Promise<FotoDosAlertas> {
  const db = clienteAdmin();
  const hoje = diaBrasilia(agora);
  const [fila, uso, custos, cotas, erros] = await Promise.all([
    filaParada(db, agora),
    db.rpc("admin_uso_por_dia", {
      p_desde: diaBrasilia(new Date(agora.getTime() - 6 * DIA_MS)),
      p_ate: hoje,
    }),
    db.rpc("admin_custos_por_livro"),
    db.rpc("admin_cotas_24h", { p_fracao: ALERTA_COTA_FRACAO }),
    lerEventos(
      {
        acoes: ["erro_servidor"],
        desde: new Date(
          agora.getTime() - ALERTA_ERROS_JANELA_MIN * 60_000,
        ).toISOString(),
        limite: 1000,
      },
      db,
    ),
  ]);
  if (uso.error || custos.error || cotas.error)
    throw new Error("Não deu para somar o uso de IA.");

  const linhas = uso.data ?? [];
  const noTeto = (custos.data ?? []).filter(
    (c) => emReais(Number(c.custo_usd)) > ALERTA_GASTO_LIVRO_BRL,
  );
  const hojePorLivro = await somaPorLivro(
    db,
    noTeto.map((c) => c.book_id),
    "custo_usd",
    inicioDoDiaBrasilia(agora).toISOString(),
  );

  return {
    filaParada: fila,
    gastoHojeUSD: linhas
      .filter((l) => l.dia === hoje)
      .reduce((t, l) => t + Number(l.custo_usd), 0),
    livrosNoTeto: noTeto.map((c) => ({
      book_id: c.book_id,
      totalUSD: Number(c.custo_usd),
      hojeUSD: hojePorLivro.get(c.book_id) ?? 0,
    })),
    semana: {
      gastoUSD: linhas.reduce((t, l) => t + Number(l.custo_usd), 0),
      perdaUSD: linhas.reduce((t, l) => t + Number(l.custo_falhas_usd), 0),
    },
    errosServidor: porRota(erros),
    cotas: (cotas.data ?? []).map((c) => ({
      book_id: c.book_id,
      pedidos: Number(c.pedidos),
      minutos: Number(c.minutos),
    })),
  };
}
