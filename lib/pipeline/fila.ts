import "server-only";
// Gravações recebidas que deviam ter virado história e não viraram (evento perdido). Mesmo
// critério para a varredura (reenvia depois de VARREDURA_GRAVACAO_MIN) e para o alerta de
// fila parada (Evals 1A: avisa depois de FILA_PARADA_MIN, quando o reenvio não adiantou).
// Fora: livro sem consentimento de IA, arquivo acima de 2 h, lote incompleto há menos de 6 h,
// gravação de mais de VARREDURA_JANELA_DIAS e a que não cabe na cota de hoje do livro (T56:
// espera a cota sem gastar execução nem acusar "fila parada"). Sem duração entra: o pipeline
// mede antes de começar.
import {
  ESPERA_LOTE_H,
  MAX_ARQUIVO_MIN,
  MAX_MINUTOS_IA_DIA,
  VARREDURA_JANELA_DIAS,
} from "@/lib/config";
import type { ClienteAdmin } from "@/lib/supabase/admin";

export type GravacaoOrfa = {
  id: string;
  book_id: string;
  lote_id: string | null;
  lote_total: number | null;
  recebido_em: string | null;
  para_historia: string | null;
  duracao_s: number | null;
};

/** Até 200 candidatas, da mais antiga para a mais nova. */
export async function gravacoesOrfas(
  db: ClienteAdmin,
  agora: number,
  idadeMin: number,
): Promise<GravacaoOrfa[]> {
  // Prompt 7: toda origem. T56: 30 dias (a cota diária adiada pode levar vários dias).
  const { data: candidatas } = await db
    .from("recordings")
    .select(
      "id, book_id, lote_id, lote_total, recebido_em, para_historia, duracao_s",
    )
    .eq("upload", "recebido")
    .is("processado_em", null)
    // Sem duração: só no 1º dia (o pipeline mede; se o arquivo não deixa, para de tentar).
    .or(
      `duracao_s.lte.${MAX_ARQUIVO_MIN * 60},and(duracao_s.is.null,recebido_em.gt.${new Date(agora - 86_400_000).toISOString()})`,
    )
    .lt("recebido_em", new Date(agora - idadeMin * 60_000).toISOString())
    .gt(
      "recebido_em",
      new Date(agora - VARREDURA_JANELA_DIAS * 86_400_000).toISOString(),
    )
    .order("recebido_em")
    .limit(200);
  const lista = candidatas ?? [];
  if (lista.length === 0) return [];
  const lotes = [
    ...new Set(lista.flatMap((g) => (g.lote_id ? [g.lote_id] : []))),
  ];
  const livrosDaLista = [...new Set(lista.map((g) => g.book_id))];
  const [
    { data: comHistoria },
    { data: livros },
    { data: doLote },
    { data: uso },
  ] = await Promise.all([
    db
      .from("story_recordings")
      .select("recording_id")
      .in(
        "recording_id",
        lista.map((g) => g.id),
      ),
    db
      .from("books")
      .select("id")
      .in("id", livrosDaLista)
      .not("ia_consentimento_em", "is", null),
    lotes.length
      ? db
          .from("recordings")
          .select("lote_id")
          .in("lote_id", lotes)
          .eq("upload", "recebido")
      : Promise.resolve({ data: [] as { lote_id: string | null }[] }),
    // Minutos transcritos em 24 h (a mesma conta de servico_iniciar_historia, T38).
    db
      .from("ai_usage")
      .select("book_id, minutos_audio")
      .in("book_id", livrosDaLista)
      .eq("etapa", "transcrever")
      .gt("criado_em", new Date(agora - 86_400_000).toISOString())
      .limit(1000),
  ]);
  const ja = new Set((comHistoria ?? []).map((s) => s.recording_id));
  const consentidos = new Set((livros ?? []).map((b) => b.id));
  const recebidas = new Map<string, number>();
  for (const r of doLote ?? [])
    if (r.lote_id)
      recebidas.set(r.lote_id, (recebidas.get(r.lote_id) ?? 0) + 1);
  // Lote ainda incompleto e com menos de 6 h: o banco diria "espere"; não gasta execução.
  const esperando = (g: (typeof lista)[number]) =>
    g.lote_id !== null &&
    g.lote_total !== null &&
    (recebidas.get(g.lote_id) ?? 0) < g.lote_total &&
    agora - new Date(g.recebido_em ?? 0).getTime() < ESPERA_LOTE_H * 3600_000;
  const usados = new Map<string, number>();
  for (const u of uso ?? [])
    usados.set(
      u.book_id,
      (usados.get(u.book_id) ?? 0) + (u.minutos_audio ?? 0),
    );
  return cabemNaCota(
    lista.filter(
      (g) => !ja.has(g.id) && consentidos.has(g.book_id) && !esperando(g),
    ),
    usados,
  );
}

/**
 * T56: da mais antiga para a mais nova, só as que cabem no que sobra da cota de 24 h do livro.
 * O banco continua sendo quem decide (servico_iniciar_historia); aqui só se evita reenviar a
 * cada 15 min o que ele vai recusar. Sem duração passa (o pipeline mede antes).
 */
export function cabemNaCota<
  G extends { book_id: string; duracao_s: number | null },
>(lista: G[], usados: Map<string, number>, teto = MAX_MINUTOS_IA_DIA): G[] {
  const livre = new Map<string, number>();
  return lista.filter((g) => {
    const sobra = livre.get(g.book_id) ?? teto - (usados.get(g.book_id) ?? 0);
    const min = (g.duracao_s ?? 0) / 60;
    if (min > sobra) {
      livre.set(g.book_id, sobra);
      return false;
    }
    livre.set(g.book_id, sobra - min);
    return true;
  });
}
