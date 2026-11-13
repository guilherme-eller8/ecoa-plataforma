import "server-only";
// Leituras das telas de histórias (prompt 6). Sempre com a sessão: a RLS decide, e as colunas
// são listadas (stories tem grant por coluna: rascunho e erro ficam de fora).
import type { Edicao, Estrutura, Marcacao, Segmento } from "@/lib/ai/schemas";
import { ESPERA_LOTE_H, MAX_ARQUIVO_MIN } from "@/lib/config";
import {
  FRASES_ESPERA,
  MOTIVOS_ESPERA,
  type EstadoHistoria,
  type MotivoEspera,
} from "@/lib/pipeline/regras";
import { assinarLeitura } from "@/lib/storage/assinar";
import { clienteSessao } from "@/lib/supabase/servidor";
import { normalizarTexto } from "@/lib/editor/conteudo";
import type { PropostaDaTela } from "@/lib/editor/tipos";
import { CHAVES_TAMANHO, type ChaveTamanho } from "@/lib/ui/tamanho";
import {
  COLUNAS_EDITAR,
  COLUNAS_LER,
  COLUNAS_LISTA,
  COLUNAS_SITUACAO,
  COLUNAS_VERSOES,
  deixadaForaDoLivro,
} from "./colunas";
import type { SegmentoDaTela } from "@/lib/editor/ouvir";
import type {
  FotoDaHistoria,
  HistoriaDaTela,
  HistoriaParaEditar,
  HistoriaParaLer,
  TextoAtualDaTela,
  VersaoDaTela,
  NomeDaTela,
  GuardadaDaTela,
  SituacaoDoAudio,
} from "./tipos";

type Versao = { story_id: string; conteudo: unknown; marcacoes: unknown };
type ClienteSessao = Awaited<ReturnType<typeof clienteSessao>>;

/**
 * Prompt 7: uma história nascida de divisão usa só alguns segmentos da gravação. Lê as
 * transcrições dessas gravações (só os segmentos) e devolve o tempo de cada segmento.
 */
async function temposDosSegmentos(
  supabase: ClienteSessao,
  gravacoes: string[],
): Promise<Map<string, Map<number, Segmento>>> {
  if (!gravacoes.length) return new Map();
  const { data } = await supabase
    .from("transcripts")
    .select("recording_id, segmentos")
    .in("recording_id", gravacoes);
  return new Map(
    (data ?? []).map((t) => [
      t.recording_id,
      new Map(((t.segmentos as Segmento[]) ?? []).map((x) => [x.id, x])),
    ]),
  );
}

function trechoDaGravacao(
  ids: number[] | null,
  tempos: Map<number, Segmento> | undefined,
): { inicio: number; fim: number; duracao: number } | null {
  if (!ids || !tempos) return null;
  const segs = ids.flatMap((id) => {
    const x = tempos.get(id);
    return x ? [x] : [];
  });
  if (!segs.length) return null;
  return {
    inicio: Math.min(...segs.map((x) => x.inicio)),
    fim: Math.max(...segs.map((x) => x.fim)),
    duracao: segs.reduce((t, x) => t + (x.fim - x.inicio), 0),
  };
}

export async function historiasDoLivro(
  livro: string,
  limite = 100,
): Promise<HistoriaDaTela[]> {
  const supabase = await clienteSessao();
  const { data: stories, error: erroStories } = await supabase
    .from("stories")
    .select(COLUNAS_LISTA)
    .eq("book_id", livro)
    .order("criado_em", { ascending: false })
    .limit(limite);
  // Consulta recusada não pode virar "Nenhuma história ainda" em silêncio.
  if (erroStories)
    console.error("[historias] lista recusada", { codigo: erroStories.code });
  const linhas = (stories ?? []).filter((s) => !deixadaForaDoLivro(s));
  if (linhas.length === 0) return [];
  const ids = linhas.map((s) => s.id);
  const perguntas = [
    ...new Set(linhas.flatMap((s) => (s.prompt_id ? [s.prompt_id] : []))),
  ];

  const [{ data: srs }, { data: versoes }, { data: ps }] = await Promise.all([
    supabase
      .from("story_recordings")
      .select("story_id, recording_id, ordem, segmentos")
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
  const [{ data: recs }, tempos] = await Promise.all([
    gravacoes.length
      ? supabase
          .from("recordings")
          .select("id, duracao_s, origem")
          .in("id", gravacoes)
      : Promise.resolve({
          data: [] as {
            id: string;
            duracao_s: number | null;
            origem: string;
          }[],
        }),
    temposDosSegmentos(supabase, [
      ...new Set(
        (srs ?? []).filter((s) => s.segmentos).map((s) => s.recording_id),
      ),
    ]),
  ]);
  const rec = new Map((recs ?? []).map((r) => [r.id, r]));
  const porHistoria = new Map<
    string,
    { duracao: number; origem: string | null; gravacoes: number }
  >();
  for (const s of srs ?? []) {
    const r = rec.get(s.recording_id);
    const atual = porHistoria.get(s.story_id) ?? {
      duracao: 0,
      origem: r?.origem ?? null,
      gravacoes: 0,
    };
    const parte = trechoDaGravacao(s.segmentos, tempos.get(s.recording_id));
    atual.duracao += parte ? parte.duracao : (r?.duracao_s ?? 0);
    atual.gravacoes += 1;
    porHistoria.set(s.story_id, atual);
  }
  // Prompt 8: o texto atual (editado pela família) vale mais que a versão da IA.
  const trechoDe = new Map(
    ((versoes ?? []) as Versao[]).map((v) => [
      v.story_id,
      (v.conteudo as Edicao | null)?.paragrafos?.[0]?.texto ?? null,
    ]),
  );
  for (const s of linhas) {
    const atual = (s.texto as Edicao | null)?.paragrafos?.[0]?.texto;
    if (atual) trechoDe.set(s.id, atual);
  }
  const perguntaDe = new Map((ps ?? []).map((p) => [p.id, p.texto]));

  return linhas.map((s) => {
    const divisao = s.divisao as {
      ia?: { historias?: unknown[] };
      final?: unknown;
    } | null;
    return {
      id: s.id,
      titulo: s.titulo,
      estado: s.estado as EstadoHistoria,
      duracaoS: Math.round(porHistoria.get(s.id)?.duracao ?? 0) || null,
      origem: porHistoria.get(s.id)?.origem ?? null,
      pergunta: s.prompt_id ? (perguntaDe.get(s.prompt_id) ?? null) : null,
      trecho: trechoDe.get(s.id) ?? null,
      criadaEm: s.criado_em,
      vista: Boolean(s.vista_em),
      gravacoes: porHistoria.get(s.id)?.gravacoes ?? 1,
      propostas: divisao?.ia?.historias?.length ?? null,
      dividida: Boolean(s.divisao_de) || Boolean(divisao?.final),
      revisada: Boolean(s.revisada_em),
    };
  });
}

export async function historiaParaLer(
  livro: string,
  historia: string,
): Promise<HistoriaParaLer | null> {
  if (!/^[0-9a-f-]{36}$/.test(historia)) return null;
  const supabase = await clienteSessao();
  const { data: s } = await supabase
    .from("stories")
    .select(COLUNAS_LER)
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
      .select("recording_id, ordem, segmentos")
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
  const { data: sugerida } = s.pergunta_sugerida
    ? await supabase
        .from("prompts")
        .select("id, texto, estado")
        .eq("id", s.pergunta_sugerida)
        .maybeSingle()
    : { data: null };
  const tempos = await temposDosSegmentos(
    supabase,
    (srs ?? []).filter((r) => r.segmentos).map((r) => r.recording_id),
  );
  const ids = [...new Set((srs ?? []).map((r) => r.recording_id))];
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
    audios: (srs ?? []).flatMap((sr) => {
      const r = (recs ?? []).find((x) => x.id === sr.recording_id);
      if (!r) return [];
      const parte = trechoDaGravacao(sr.segmentos, tempos.get(r.id));
      return [
        {
          id: r.id,
          url: urls.get(r.caminho) ?? null,
          duracaoS: parte ? Math.round(parte.fim - parte.inicio) : r.duracao_s,
          ...(parte ? { inicioS: parte.inicio, fimS: parte.fim } : {}),
        },
      ];
    }),
    sugestao:
      sugerida &&
      (sugerida.estado === "para_enviar" || sugerida.estado === "enviada")
        ? { id: sugerida.id, texto: sugerida.texto }
        : null,
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

/**
 * Situação de cada áudio recebido: virou história (a mais antiga, o contêiner), ou por que
 * ainda espera. Prompt 7: lote esperando os outros, fora das histórias, mais de 2 h.
 */
export async function situacaoDosAudios(
  livro: string,
  iaConfirmada: boolean,
): Promise<Map<string, SituacaoDoAudio>> {
  const supabase = await clienteSessao();
  const { data: recs } = await supabase
    .from("recordings")
    .select("id, lote_id, lote_total, duracao_s, recebido_em, processado_em")
    .eq("book_id", livro)
    .eq("upload", "recebido");
  const ids = (recs ?? []).map((r) => r.id);
  const { data: srs } = ids.length
    ? await supabase
        .from("story_recordings")
        .select("story_id, recording_id")
        .in("recording_id", ids)
    : { data: [] };
  const historias = [...new Set((srs ?? []).map((s) => s.story_id))];
  const { data: stories } = historias.length
    ? await supabase
        .from("stories")
        .select(COLUNAS_SITUACAO)
        .in("id", historias)
    : { data: [] };
  const estadoDe = new Map((stories ?? []).map((s) => [s.id, s]));
  // O contêiner (a mais antiga) representa a gravação; as filhas vêm dele.
  const historiaDe = new Map<string, string>();
  for (const sr of srs ?? []) {
    const atual = historiaDe.get(sr.recording_id);
    const a = atual ? estadoDe.get(atual)?.criado_em : null;
    const b = estadoDe.get(sr.story_id)?.criado_em;
    if (!atual || (a && b && b < a))
      historiaDe.set(sr.recording_id, sr.story_id);
  }
  const recebidasNoLote = new Map<string, number>();
  for (const r of recs ?? [])
    if (r.lote_id)
      recebidasNoLote.set(r.lote_id, (recebidasNoLote.get(r.lote_id) ?? 0) + 1);

  const mapa = new Map<string, SituacaoDoAudio>();
  const agora = Date.now();
  for (const r of recs ?? []) {
    const h = historiaDe.get(r.id);
    if (h) {
      mapa.set(r.id, {
        tipo: "historia",
        historia: h,
        estado: (estadoDe.get(h)?.estado ?? "ouvindo") as EstadoHistoria,
      });
      continue;
    }
    const loteIncompleto =
      r.lote_id !== null &&
      r.lote_total !== null &&
      (recebidasNoLote.get(r.lote_id) ?? 0) < r.lote_total &&
      agora - new Date(r.recebido_em ?? 0).getTime() < ESPERA_LOTE_H * 3600_000;
    const motivo: MotivoEspera = r.processado_em
      ? "descartada"
      : r.duracao_s == null
        ? "sem_duracao"
        : r.duracao_s > MAX_ARQUIVO_MIN * 60
          ? "longa"
          : !iaConfirmada
            ? "sem_consentimento"
            : loteIncompleto
              ? "lote_incompleto"
              : "nao_recebido";
    const faltam =
      motivo === "lote_incompleto" && r.lote_id && r.lote_total
        ? r.lote_total - (recebidasNoLote.get(r.lote_id) ?? 0)
        : 0;
    mapa.set(r.id, {
      tipo: "espera",
      rotulo:
        faltam > 0
          ? faltam === 1
            ? "Esperando o outro áudio"
            : `Esperando os outros ${faltam}`
          : MOTIVOS_ESPERA[motivo],
      frase: FRASES_ESPERA[motivo],
      confirmar: motivo === "sem_consentimento",
    });
  }
  return mapa;
}

/** Gravações que chegaram e ainda não viraram história, para a home (no máximo 5). */
export async function gravacoesGuardadas(
  livro: string,
  iaConfirmada: boolean,
): Promise<GuardadaDaTela[]> {
  const situacoes = await situacaoDosAudios(livro, iaConfirmada);
  const esperando = [...situacoes.entries()].filter(
    ([, s]) => s.tipo === "espera",
  );
  if (esperando.length === 0) return [];
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("recordings")
    .select("id, origem, duracao_s, recebido_em, titulo")
    .in(
      "id",
      esperando.map(([id]) => id),
    )
    .order("recebido_em", { ascending: false })
    .limit(5);
  return (data ?? []).map((r) => {
    const s = situacoes.get(r.id);
    return {
      id: r.id,
      origem: r.origem,
      titulo: r.titulo,
      duracaoS: r.duracao_s,
      recebidaEm: r.recebido_em ?? "",
      frase: s?.tipo === "espera" ? s.frase : "Guardada.",
      confirmar: s?.tipo === "espera" ? s.confirmar : false,
    };
  });
}

// ── Editor (prompt 8) ────────────────────────────────────────────────────

const PAPEL_DO_FALANTE = {
  entrevistador: "Entrevistador",
  outro: "Outra voz",
} as const;

/** Fotos ligadas à história, na ordem, com URL assinada. */
export async function fotosDaHistoria(
  livro: string,
  historia: string,
): Promise<FotoDaHistoria[]> {
  const supabase = await clienteSessao();
  const { data: ligadas } = await supabase
    .from("story_photos")
    .select("photo_id, ordem, criado_em")
    .eq("book_id", livro)
    .eq("story_id", historia)
    .order("ordem")
    .order("criado_em");
  const ids = (ligadas ?? []).map((l) => l.photo_id);
  if (!ids.length) return [];
  const { data: fotos } = await supabase
    .from("photos")
    .select("id, caminho, largura, altura, legenda")
    .eq("book_id", livro)
    .in("id", ids);
  const urls = await assinarLeitura(
    "acervo",
    (fotos ?? []).map((f) => f.caminho),
  );
  return ids.flatMap((id) => {
    const f = (fotos ?? []).find((x) => x.id === id);
    const url = f ? urls.get(f.caminho) : undefined;
    return f && url
      ? [
          {
            id: f.id,
            url,
            largura: f.largura,
            altura: f.altura,
            legenda: f.legenda,
          },
        ]
      : [];
  });
}

/**
 * Tudo que o editor precisa de uma história pronta: o texto atual (ou a última versão), os
 * grifos, os segmentos da transcrição com quem fala, os áudios e as fotos. null se não for
 * deste livro ou ainda não estiver pronta.
 */
export async function historiaParaEditar(
  livro: string,
  historia: string,
  autor: string,
): Promise<HistoriaParaEditar | null> {
  if (!/^[0-9a-f-]{36}$/.test(historia)) return null;
  const supabase = await clienteSessao();
  const { data: s } = await supabase
    .from("stories")
    .select(COLUNAS_EDITAR)
    .eq("book_id", livro)
    .eq("id", historia)
    .maybeSingle();
  if (!s || s.estado !== "pronta") return null;

  const [{ data: ultima }, { count }, { data: srs }, ler, fotos] =
    await Promise.all([
      supabase
        .from("story_versions")
        .select("conteudo, marcacoes")
        .eq("story_id", historia)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("story_versions")
        .select("numero", { count: "exact", head: true })
        .eq("story_id", historia),
      supabase
        .from("story_recordings")
        .select("recording_id, ordem, segmentos")
        .eq("story_id", historia)
        .order("ordem"),
      historiaParaLer(livro, historia),
      fotosDaHistoria(livro, historia),
    ]);
  if (!ler) return null;

  const conteudo = s.texto ?? ultima?.conteudo ?? null;
  const texto = normalizarTexto(conteudo);
  // A história da IA guarda o título em stories.titulo (P46); o ano só existe depois de editar.
  if (!s.texto) {
    texto.titulo = s.titulo ?? texto.titulo;
    texto.ano = s.ano;
  }
  const marcacoes = (
    s.texto ? s.texto_marcacoes : (ultima?.marcacoes ?? [])
  ) as Marcacao[] | null;

  // Segmentos da história, na ordem das gravações, com quem fala.
  const gravacoes = (srs ?? []).map((r) => r.recording_id);
  const { data: ts } = gravacoes.length
    ? await supabase
        .from("transcripts")
        .select("recording_id, segmentos")
        .in("recording_id", gravacoes)
    : { data: [] };
  const papel = new Map(
    ((s.estrutura as Estrutura | null)?.falantes ?? []).map((f) => [
      f.falante,
      f.papel,
    ]),
  );
  const segmentos: SegmentoDaTela[] = (srs ?? []).flatMap((sr) => {
    const todos =
      ((ts ?? []).find((t) => t.recording_id === sr.recording_id)?.segmentos as
        Segmento[] | undefined) ?? [];
    const meus = sr.segmentos ? new Set(sr.segmentos) : null;
    return todos
      .filter((x) => !meus || meus.has(x.id))
      .map((x) => {
        const p = papel.get(x.falante);
        return {
          id: x.id,
          gravacao: sr.recording_id,
          inicio: x.inicio,
          fim: x.fim,
          texto: x.texto,
          falante: !p || p === "autor" ? autor : PAPEL_DO_FALANTE[p],
        };
      });
  });

  const ia = await propostasDoEditor(supabase, livro, historia);
  return {
    ...ia,
    id: s.id,
    livroId: livro,
    autor,
    pergunta: ler.pergunta,
    sugestao: ler.sugestao,
    texto,
    marcacoes: marcacoes ?? [],
    rev: s.texto_rev,
    revisada: Boolean(s.revisada_em),
    segmentos,
    audios: ler.audios.map((a) => ({ id: a.id, url: a.url })),
    fotos,
    versoes: count ?? 1,
  };
}

/**
 * Prompt 9: o tamanho atual (da última versão), as propostas que a tela precisa mostrar
 * (gerando, pronta e a última que falhou na última hora, por tipo) e quantos áudios
 * acrescentados ainda não entraram no texto (a mesma conta de privado.audios_fora_do_texto).
 */
export async function propostasDoEditor(
  supabase: Awaited<ReturnType<typeof clienteSessao>>,
  livro: string,
  historia: string,
): Promise<
  Pick<HistoriaParaEditar, "tamanho" | "propostas" | "audiosForaDoTexto">
> {
  const umaHora = new Date(Date.now() - 3600_000).toISOString();
  const [{ data: v }, { data: ps }, { data: extras }] = await Promise.all([
    supabase
      .from("story_versions")
      .select("tamanho")
      .eq("story_id", historia)
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("story_proposals")
      .select(
        "id, tipo, estado, tamanho, pedido, mudancas, ordem, marcacoes, erro, pedida_em, gravacoes, aplicadas",
      )
      .eq("book_id", livro)
      .eq("story_id", historia)
      .order("pedida_em", { ascending: false })
      .limit(100),
    supabase
      .from("recordings")
      .select("id")
      .eq("book_id", livro)
      .eq("para_historia", historia),
  ]);
  const lista = ps ?? [];
  const vistos = new Set<string>();
  const propostas: PropostaDaTela[] = [];
  for (const p of lista) {
    const pendente = p.estado === "gerando" || p.estado === "pronta";
    const falhaRecente = p.estado === "falhou" && p.pedida_em > umaHora;
    if (vistos.has(p.tipo) || !(pendente || falhaRecente)) {
      if (p.estado !== "falhou") vistos.add(p.tipo);
      continue;
    }
    vistos.add(p.tipo);
    propostas.push({
      id: p.id,
      tipo: p.tipo,
      estado: p.estado,
      tamanho: (CHAVES_TAMANHO as readonly string[]).includes(p.tamanho)
        ? (p.tamanho as ChaveTamanho)
        : "medio",
      pedido: (p.pedido ?? {}) as PropostaDaTela["pedido"],
      mudancas: (p.mudancas ?? []) as unknown as PropostaDaTela["mudancas"],
      ordem: p.ordem,
      marcacoes: (p.marcacoes ?? []) as unknown as PropostaDaTela["marcacoes"],
      erro: p.erro,
      pedidaEm: p.pedida_em,
    });
  }
  const cobertas = new Set(
    lista
      .filter(
        (p) =>
          p.estado === "aplicada" &&
          (p.tipo === "audio" ||
            (p.aplicadas?.length ?? 0) ===
              ((p.mudancas as unknown[] | null)?.length ?? -1)),
      )
      .flatMap((p) => p.gravacoes ?? []),
  );
  const tamanho = v?.tamanho ?? "medio";
  return {
    tamanho: (CHAVES_TAMANHO as readonly string[]).includes(tamanho)
      ? (tamanho as ChaveTamanho)
      : "medio",
    propostas: propostas.reverse(),
    audiosForaDoTexto: (extras ?? []).filter((g) => !cobertas.has(g.id))
      .length,
  };
}

function resumoDoConteudo(c: unknown) {
  const t = normalizarTexto(c);
  return { titulo: t.titulo, paragrafos: t.paragrafos.map((p) => p.texto) };
}

/** Histórico: versões (mais nova primeiro) e o texto atual ainda não guardado como versão. */
export async function versoesDaHistoria(
  livro: string,
  historia: string,
  usuario: string,
): Promise<{
  titulo: string | null;
  atual: TextoAtualDaTela;
  versoes: VersaoDaTela[];
} | null> {
  if (!/^[0-9a-f-]{36}$/.test(historia)) return null;
  const supabase = await clienteSessao();
  const { data: s } = await supabase
    .from("stories")
    .select(COLUNAS_VERSOES)
    .eq("book_id", livro)
    .eq("id", historia)
    .maybeSingle();
  if (!s || s.estado !== "pronta") return null;
  const { data } = await supabase
    .from("story_versions")
    .select(
      "numero, origem, criado_por, criado_em, restaurada_de, conteudo, tamanho, proposta_id",
    )
    .eq("story_id", historia)
    .order("numero", { ascending: false })
    .limit(200);
  const ids = (data ?? []).flatMap((v) => (v.proposta_id ? [v.proposta_id] : []));
  const { data: props } = ids.length
    ? await supabase.from("story_proposals").select("id, tipo").in("id", ids)
    : { data: [] };
  const tipo = new Map((props ?? []).map((p) => [p.id, p.tipo]));
  const versoes = (data ?? []).map((v): VersaoDaTela => ({
    numero: v.numero,
    origem: v.origem,
    minha: v.criado_por === usuario,
    criadaEm: v.criado_em,
    restauradaDe: v.restaurada_de,
    proposta: v.proposta_id ? (tipo.get(v.proposta_id) ?? null) : null,
    tamanho: v.tamanho,
    ...resumoDoConteudo(v.conteudo),
  }));
  const atual: TextoAtualDaTela =
    s.texto && s.texto_rev > s.versao_rev
      ? {
          minha: s.texto_por === usuario,
          origem: s.texto_origem,
          em: s.texto_em,
          ...resumoDoConteudo(s.texto),
        }
      : null;
  return { titulo: s.titulo, atual, versoes };
}

/** Prompt 9: "Gravar mais sobre isso" só para história pronta; devolve o título dela. */
export async function historiaParaGravarMais(
  livro: string,
  historia: string,
): Promise<{ id: string; titulo: string } | null> {
  if (!/^[0-9a-f-]{36}$/.test(historia)) return null;
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("stories")
    .select("id, titulo, estado")
    .eq("book_id", livro)
    .eq("id", historia)
    .maybeSingle();
  if (!data || data.estado !== "pronta") return null;
  return { id: data.id, titulo: data.titulo ?? "Sem título" };
}
