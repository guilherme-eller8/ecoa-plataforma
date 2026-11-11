import "server-only";
// Leituras das telas de histórias (prompt 6). Sempre com a sessão: a RLS decide, e as colunas
// são listadas (stories tem grant por coluna: rascunho e erro ficam de fora).
import type { Edicao, Marcacao } from "@/lib/ai/schemas";
import { MAX_HISTORIA_MIN } from "@/lib/config";
import {
  MOTIVOS_ESPERA,
  ehAvulsa,
  type EstadoHistoria,
} from "@/lib/pipeline/regras";
import { assinarLeitura } from "@/lib/storage/assinar";
import { clienteSessao } from "@/lib/supabase/servidor";
import type {
  HistoriaDaTela,
  HistoriaParaLer,
  NomeDaTela,
  SituacaoDoAudio,
} from "./tipos";

type Versao = { story_id: string; conteudo: unknown; marcacoes: unknown };

export async function historiasDoLivro(
  livro: string,
  limite = 100,
): Promise<HistoriaDaTela[]> {
  const supabase = await clienteSessao();
  const { data: stories } = await supabase
    .from("stories")
    .select("id, titulo, estado, prompt_id, criado_em, vista_em")
    .eq("book_id", livro)
    .order("criado_em", { ascending: false })
    .limit(limite);
  const linhas = stories ?? [];
  if (linhas.length === 0) return [];
  const ids = linhas.map((s) => s.id);
  const perguntas = [
    ...new Set(linhas.flatMap((s) => (s.prompt_id ? [s.prompt_id] : []))),
  ];

  const [{ data: srs }, { data: versoes }, { data: ps }] = await Promise.all([
    supabase
      .from("story_recordings")
      .select("story_id, recording_id, ordem")
      .in("story_id", ids)
      .order("ordem"),
    supabase
      .from("story_versions")
      .select("story_id, conteudo, marcacoes")
      .in("story_id", ids)
      .eq("numero", 1),
    perguntas.length
      ? supabase.from("prompts").select("id, texto").in("id", perguntas)
      : Promise.resolve({ data: [] as { id: string; texto: string }[] }),
  ]);
  const gravacoes = [...new Set((srs ?? []).map((s) => s.recording_id))];
  const { data: recs } = gravacoes.length
    ? await supabase
        .from("recordings")
        .select("id, duracao_s, origem")
        .in("id", gravacoes)
    : { data: [] };
  const rec = new Map((recs ?? []).map((r) => [r.id, r]));
  const porHistoria = new Map<
    string,
    { duracao: number; origem: string | null }
  >();
  for (const s of srs ?? []) {
    const r = rec.get(s.recording_id);
    const atual = porHistoria.get(s.story_id) ?? {
      duracao: 0,
      origem: r?.origem ?? null,
    };
    atual.duracao += r?.duracao_s ?? 0;
    porHistoria.set(s.story_id, atual);
  }
  const trechoDe = new Map(
    ((versoes ?? []) as Versao[]).map((v) => [
      v.story_id,
      (v.conteudo as Edicao | null)?.paragrafos?.[0]?.texto ?? null,
    ]),
  );
  const perguntaDe = new Map((ps ?? []).map((p) => [p.id, p.texto]));

  return linhas.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    estado: s.estado as EstadoHistoria,
    duracaoS: porHistoria.get(s.id)?.duracao || null,
    origem: porHistoria.get(s.id)?.origem ?? null,
    pergunta: s.prompt_id ? (perguntaDe.get(s.prompt_id) ?? null) : null,
    trecho: trechoDe.get(s.id) ?? null,
    criadaEm: s.criado_em,
    vista: Boolean(s.vista_em),
  }));
}

export async function historiaParaLer(
  livro: string,
  historia: string,
): Promise<HistoriaParaLer | null> {
  if (!/^[0-9a-f-]{36}$/.test(historia)) return null;
  const supabase = await clienteSessao();
  const { data: s } = await supabase
    .from("stories")
    .select("id, titulo, estado, prompt_id")
    .eq("book_id", livro)
    .eq("id", historia)
    .maybeSingle();
  if (!s) return null;
  const [{ data: v }, { data: srs }, { data: p }] = await Promise.all([
    supabase
      .from("story_versions")
      .select("conteudo, marcacoes")
      .eq("story_id", historia)
      .eq("numero", 1)
      .maybeSingle(),
    supabase
      .from("story_recordings")
      .select("recording_id, ordem")
      .eq("story_id", historia)
      .order("ordem"),
    s.prompt_id
      ? supabase
          .from("prompts")
          .select("texto")
          .eq("id", s.prompt_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const ids = (srs ?? []).map((r) => r.recording_id);
  const { data: recs } = ids.length
    ? await supabase
        .from("recordings")
        .select("id, caminho, duracao_s")
        .eq("book_id", livro)
        .in("id", ids)
    : { data: [] };
  const urls = await assinarLeitura(
    "audios",
    (recs ?? []).map((r) => r.caminho),
  );
  const edicao = (v?.conteudo ?? null) as Edicao | null;
  return {
    id: s.id,
    titulo: s.titulo,
    estado: s.estado as EstadoHistoria,
    pergunta: p?.texto ?? null,
    paragrafos: edicao?.paragrafos.map((x) => x.texto) ?? [],
    marcacoes: ((v?.marcacoes ?? []) as Marcacao[]) ?? [],
    lacunas: edicao?.lacunas ?? [],
    audios: ids.flatMap((id) => {
      const r = (recs ?? []).find((x) => x.id === id);
      return r
        ? [
            {
              id: r.id,
              url: urls.get(r.caminho) ?? null,
              duracaoS: r.duracao_s,
            },
          ]
        : [];
    }),
  };
}

export async function nomesDoLivro(livro: string): Promise<NomeDaTela[]> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("glossary_entries")
    .select("id, tipo, nome, apelidos, estado")
    .eq("book_id", livro)
    .neq("estado", "recusado")
    .order("nome");
  return (data ?? []) as NomeDaTela[];
}

/** Situação de cada áudio recebido: virou história, ou por que ainda espera. */
export async function situacaoDosAudios(
  livro: string,
  iaConfirmada: boolean,
): Promise<Map<string, SituacaoDoAudio>> {
  const supabase = await clienteSessao();
  const { data: recs } = await supabase
    .from("recordings")
    .select("id, origem, lote_id, duracao_s")
    .eq("book_id", livro)
    .eq("upload", "recebido");
  const ids = (recs ?? []).map((r) => r.id);
  const { data: srs } = ids.length
    ? await supabase
        .from("story_recordings")
        .select("story_id, recording_id")
        .in("recording_id", ids)
    : { data: [] };
  const historiaDe = new Map(
    (srs ?? []).map((s) => [s.recording_id, s.story_id]),
  );
  const historias = [...new Set(historiaDe.values())];
  const { data: stories } = historias.length
    ? await supabase.from("stories").select("id, estado").in("id", historias)
    : { data: [] };
  const estadoDe = new Map((stories ?? []).map((s) => [s.id, s.estado]));

  const mapa = new Map<string, SituacaoDoAudio>();
  for (const r of recs ?? []) {
    const h = historiaDe.get(r.id);
    if (h) {
      mapa.set(r.id, {
        tipo: "historia",
        historia: h,
        estado: (estadoDe.get(h) ?? "ouvindo") as EstadoHistoria,
      });
      continue;
    }
    const motivo: keyof typeof MOTIVOS_ESPERA = !ehAvulsa(r)
      ? "divisao"
      : r.duracao_s == null
        ? "sem_duracao"
        : r.duracao_s > MAX_HISTORIA_MIN * 60
          ? "longa"
          : !iaConfirmada
            ? "sem_consentimento"
            : "nao_recebido";
    mapa.set(r.id, {
      tipo: "espera",
      rotulo: MOTIVOS_ESPERA[motivo],
      confirmar: motivo === "sem_consentimento",
    });
  }
  return mapa;
}
