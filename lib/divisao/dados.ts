import "server-only";
// Leitura da tela "Confira as histórias" (prompt 7). Sempre com a sessão (a RLS decide) e com
// filtro explícito pelo livro da URL. As URLs são assinadas só para os caminhos que essa leitura
// devolveu: nada vindo do navegador.
import type { Segmento } from "@/lib/ai/schemas";
import { assinarLeitura } from "@/lib/storage/assinar";
import { clienteSessao } from "@/lib/supabase/servidor";
import { COLUNAS_DIVISAO } from "@/lib/historias/colunas";
import type { HistoriaProposta } from "./limpar";
import type { DivisaoDaTela } from "./tipos";

type DivisaoGuardada = {
  ia?: { historias?: HistoriaProposta[] };
  final?: unknown;
};

export async function divisaoParaConferir(
  livro: string,
  historia: string,
): Promise<DivisaoDaTela | null> {
  if (!/^[0-9a-f-]{36}$/.test(historia)) return null;
  const supabase = await clienteSessao();
  const { data: s } = await supabase
    .from("stories")
    .select(COLUNAS_DIVISAO)
    .eq("book_id", livro)
    .eq("id", historia)
    .maybeSingle();
  const divisao = s?.divisao as DivisaoGuardada | null;
  if (!s || !divisao?.ia?.historias) return null;
  if (s.estado !== "separar" || divisao.final)
    return {
      historiaId: s.id,
      situacao: "confirmada",
      propostas: [],
      segmentos: [],
      audios: [],
      perguntas: {},
    };

  const { data: srs } = await supabase
    .from("story_recordings")
    .select("recording_id, ordem")
    .eq("story_id", historia)
    .order("ordem");
  const ids = (srs ?? []).map((x) => x.recording_id);
  const parteDe = new Map((srs ?? []).map((x) => [x.recording_id, x.ordem]));
  const propostas = divisao.ia.historias;
  const perguntaIds = [
    ...new Set(
      propostas.flatMap((h) =>
        [h.promptId, h.sugeridaId].filter((x): x is string => Boolean(x)),
      ),
    ),
  ];
  const [{ data: ts }, { data: recs }, { data: ps }] = await Promise.all([
    ids.length
      ? supabase
          .from("transcripts")
          .select("recording_id, segmentos") // sem `palavras`: pesado e desnecessário
          .in("recording_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase
          .from("recordings")
          .select("id, caminho")
          .eq("book_id", livro)
          .in("id", ids)
      : Promise.resolve({ data: [] }),
    perguntaIds.length
      ? supabase
          .from("prompts")
          .select("id, texto")
          .eq("book_id", livro)
          .in("id", perguntaIds)
      : Promise.resolve({ data: [] as { id: string; texto: string }[] }),
  ]);
  const urls = await assinarLeitura(
    "audios",
    (recs ?? []).map((r) => r.caminho),
  );
  const segmentos = (ts ?? []).flatMap((t) =>
    ((t.segmentos as Segmento[]) ?? []).map((x) => ({
      id: x.id,
      gravacao: t.recording_id,
      parte: parteDe.get(t.recording_id) ?? 1,
      inicio: x.inicio,
      fim: x.fim,
      texto: x.texto,
    })),
  );
  return {
    historiaId: s.id,
    situacao: "separar",
    propostas,
    segmentos: segmentos.sort((a, b) => a.id - b.id),
    audios: (recs ?? []).map((r) => ({
      gravacao: r.id,
      parte: parteDe.get(r.id) ?? 1,
      url: urls.get(r.caminho) ?? null,
    })),
    perguntas: Object.fromEntries((ps ?? []).map((p) => [p.id, p.texto])),
  };
}
