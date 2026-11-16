import "server-only";
// Gravações recebidas que deviam ter virado história e não viraram (evento perdido). Mesmo
// critério para a varredura (reenvia depois de VARREDURA_GRAVACAO_MIN) e para o alerta de
// fila parada (Evals 1A: avisa depois de FILA_PARADA_MIN, quando o reenvio não adiantou).
// Fora: livro sem consentimento de IA, arquivo acima de 2 h, lote incompleto há menos de 6 h,
// gravação de mais de VARREDURA_JANELA_H (áudio de teste antigo não volta).
import {
  ESPERA_LOTE_H,
  MAX_ARQUIVO_MIN,
  VARREDURA_JANELA_H,
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
  // Prompt 7: toda origem; 48 h (cobre a cota diária adiada; áudio de teste antigo não volta).
  const { data: candidatas, error: erroCandidatas } = await db
    .from("recordings")
    .select(
      "id, book_id, lote_id, lote_total, recebido_em, para_historia, duracao_s",
    )
    .eq("upload", "recebido")
    .is("processado_em", null)
    .lte("duracao_s", MAX_ARQUIVO_MIN * 60)
    .lt("recebido_em", new Date(agora - idadeMin * 60_000).toISOString())
    .gt(
      "recebido_em",
      new Date(agora - VARREDURA_JANELA_H * 3600_000).toISOString(),
    )
    .order("recebido_em")
    .limit(200);
  // Consulta que falha não pode virar "nada a fazer": a execução da varredura acabaria
  // "concluída" e a gravação ficaria parada sem ninguém saber (16/11). Falha alto.
  if (erroCandidatas) throw new Error("fila:consulta");
  const lista = candidatas ?? [];
  if (lista.length === 0) return [];
  const lotes = [
    ...new Set(lista.flatMap((g) => (g.lote_id ? [g.lote_id] : []))),
  ];
  const [historias, consentimento, loteRecebido] = await Promise.all([
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
      .in("id", [...new Set(lista.map((g) => g.book_id))])
      .not("ia_consentimento_em", "is", null),
    lotes.length
      ? db
          .from("recordings")
          .select("lote_id")
          .in("lote_id", lotes)
          .eq("upload", "recebido")
      : Promise.resolve({
          data: [] as { lote_id: string | null }[],
          error: null,
        }),
  ]);
  if (historias.error || consentimento.error || loteRecebido.error)
    throw new Error("fila:consulta");
  const comHistoria = historias.data;
  const livros = consentimento.data;
  const doLote = loteRecebido.data;
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
  return lista.filter(
    (g) => !ja.has(g.id) && consentidos.has(g.book_id) && !esperando(g),
  );
}
