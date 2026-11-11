import "server-only";
// Leituras e escritas do pipeline com a chave secreta. Nunca recebe book_id de fora para
// decidir o livro: ele vem da gravação ou da história (as FKs compostas recusam mistura).
import { MAX_RESUMOS_CONTEXTO } from "@/lib/config";
import {
  Glossario,
  type Edicao,
  type Estrutura,
  type Segmento,
} from "@/lib/ai/schemas";
import { clienteAdmin, type ClienteAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/tipos";
import type { BancoPipeline, LinhaUso, Rascunho } from "./processar";
import type { EstadoHistoria } from "./regras";

const json = (v: unknown) => v as Json;

function falhar(onde: string, error: { code?: string } | null): never {
  // Sem a mensagem do Postgres (pode citar valores); só o código.
  throw new Error(`banco:${onde}:${error?.code ?? "?"}`);
}

export function bancoPipeline(db: ClienteAdmin = clienteAdmin()): BancoPipeline {
  return {
    async iniciar(gravacao) {
      const { data, error } = await db.rpc("servico_iniciar_historia", {
        p_recording: gravacao,
      });
      if (error) falhar("iniciar", error);
      const r = data?.[0];
      const { data: g } = await db
        .from("recordings")
        .select("book_id")
        .eq("id", gravacao)
        .maybeSingle();
      return {
        historia: r?.historia ?? null,
        estado: (r?.estado ?? null) as EstadoHistoria | null,
        motivo: r?.motivo ?? null,
        livro: g?.book_id ?? null,
      };
    },

    async gravacaoParaTranscrever(gravacao, historia) {
      const { data: sr } = await db
        .from("story_recordings")
        .select("segmento_inicial")
        .eq("story_id", historia)
        .eq("recording_id", gravacao)
        .maybeSingle();
      if (!sr) return null;
      const { data: g } = await db
        .from("recordings")
        .select("book_id, caminho, nome_arquivo, duracao_s")
        .eq("id", gravacao)
        .maybeSingle();
      if (!g) return null;
      return {
        livro: g.book_id,
        caminho: g.caminho,
        nomeArquivo: g.nome_arquivo,
        duracaoS: g.duracao_s,
        segmentoInicial: sr.segmento_inicial,
      };
    },

    async temTranscricao(gravacao) {
      const { count } = await db
        .from("transcripts")
        .select("recording_id", { count: "exact", head: true })
        .eq("recording_id", gravacao);
      return (count ?? 0) > 0;
    },

    async gravarTranscricao(t) {
      const { error } = await db.from("transcripts").upsert(
        {
          recording_id: t.gravacao,
          book_id: t.livro,
          provedor: t.provedor,
          modelo: t.modelo,
          segmentos: json(t.segmentos),
          palavras: json(t.palavras),
          minutos: Math.round(t.minutos * 100) / 100,
        },
        { onConflict: "recording_id", ignoreDuplicates: true },
      );
      if (error) falhar("transcricao", error);
    },

    async segmentosDaHistoria(historia) {
      const { data: srs, error } = await db
        .from("story_recordings")
        .select("recording_id, ordem")
        .eq("story_id", historia)
        .order("ordem");
      if (error) falhar("segmentos", error);
      const ids = (srs ?? []).map((s) => s.recording_id);
      if (ids.length === 0) return [];
      const { data: ts } = await db
        .from("transcripts")
        .select("recording_id, segmentos")
        .in("recording_id", ids);
      const porId = new Map(
        (ts ?? []).map((t) => [t.recording_id, t.segmentos as Segmento[]]),
      );
      return ids.flatMap((id) => porId.get(id) ?? []);
    },

    async estrutura(historia) {
      const { data } = await db
        .from("stories")
        .select("estrutura")
        .eq("id", historia)
        .maybeSingle();
      return (data?.estrutura ?? null) as Estrutura | null;
    },

    async gravarEstrutura(historia, e) {
      const { error } = await db
        .from("stories")
        .update({ estrutura: json(e) })
        .eq("id", historia)
        .eq("estado", "ouvindo");
      if (error) falhar("estrutura", error);
    },

    async mudarEtapa(historia, para, erro) {
      const { data, error } = await db.rpc("servico_mudar_etapa", {
        p_story: historia,
        p_para: para,
        p_erro_etapa: erro?.etapa,
        p_erro: erro?.codigo,
      });
      if (error) falhar("etapa", error);
      return Boolean(data);
    },

    async rascunho(historia) {
      const { data } = await db
        .from("stories")
        .select("rascunho")
        .eq("id", historia)
        .maybeSingle();
      return (data?.rascunho ?? null) as Rascunho | null;
    },

    async gravarRascunho(historia, r) {
      const { error } = await db
        .from("stories")
        .update({ rascunho: json(r) })
        .eq("id", historia)
        .eq("estado", "escrevendo");
      if (error) falhar("rascunho", error);
    },

    async concluir(historia, tamanho, modelos, hash) {
      const { data, error } = await db.rpc("servico_concluir_historia", {
        p_story: historia,
        p_tamanho: tamanho,
        p_modelos: json(modelos),
        p_hash: json(hash),
      });
      if (error) falhar("concluir", error);
      return Boolean(data);
    },

    async versaoDaIA(historia) {
      const { data } = await db
        .from("story_versions")
        .select("conteudo")
        .eq("story_id", historia)
        .eq("numero", 1)
        .maybeSingle();
      return (data?.conteudo ?? null) as Edicao | null;
    },

    async contexto(livro) {
      const [{ data: b }, { data: nomes }, { data: resumos }] =
        await Promise.all([
          db
            .from("books")
            .select("autor_nome, autor_apelido")
            .eq("id", livro)
            .maybeSingle(),
          db
            .from("glossary_entries")
            .select("tipo, nome, apelidos, observacao")
            .eq("book_id", livro)
            .eq("estado", "aceito")
            .order("nome"),
          db
            .from("book_context")
            .select("story_id, resumo")
            .eq("book_id", livro)
            .order("atualizado_em", { ascending: false })
            .limit(MAX_RESUMOS_CONTEXTO),
        ]);
      const ids = (resumos ?? []).map((r) => r.story_id);
      const { data: titulos } = ids.length
        ? await db.from("stories").select("id, titulo").in("id", ids)
        : { data: [] };
      const tituloDe = new Map((titulos ?? []).map((s) => [s.id, s.titulo]));
      const entrada = (n: {
        nome: string;
        apelidos: string[];
        observacao: string | null;
      }) => ({
        nome: n.nome,
        apelidos: n.apelidos,
        relacao: n.observacao ?? undefined,
      });
      const glossario = Glossario.parse({
        autor: {
          nome: b?.autor_nome?.trim() || "o autor",
          apelido: b?.autor_apelido?.trim() || undefined,
        },
        sobre: "",
        pessoas: (nomes ?? []).filter((n) => n.tipo === "pessoa").map(entrada),
        lugares: (nomes ?? []).filter((n) => n.tipo === "lugar").map(entrada),
      });
      const historias = (resumos ?? [])
        .map(
          (r) =>
            `- ${tituloDe.get(r.story_id) ?? "(sem título)"}: ${r.resumo.replace(/\s+/g, " ")}`,
        )
        .join("\n");
      return { glossario, historias: historias || "(nenhuma ainda)" };
    },

    async gravarMemoria(historia, livro, resumo, temas) {
      const limpo = resumo.trim().slice(0, 600);
      if (!limpo) return;
      const { error } = await db.from("book_context").upsert(
        {
          story_id: historia,
          book_id: livro,
          resumo: limpo,
          temas: temas
            .map((t) => t.trim().slice(0, 60))
            .filter(Boolean)
            .slice(0, 8),
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "story_id" },
      );
      if (error) falhar("memoria", error);
    },

    async sugerirNomes(historia, nomes) {
      const { data, error } = await db.rpc("servico_sugerir_nomes", {
        p_story: historia,
        p_nomes: json(nomes),
      });
      if (error) falhar("nomes", error);
      return data ?? 0;
    },

    async registrarUso(l: LinhaUso) {
      const { error } = await db.from("ai_usage").insert({
        book_id: l.livro,
        story_id: l.historia ?? null,
        recording_id: l.gravacao ?? null,
        etapa: l.etapa,
        provedor: l.provedor,
        modelo: l.modelo,
        ok: l.ok,
        tokens_entrada: l.uso?.entrada ?? 0,
        tokens_saida: l.uso?.saida ?? 0,
        tokens_cache_lido: l.uso?.cacheLido ?? 0,
        tokens_cache_gravado: l.uso?.cacheGravado ?? 0,
        minutos_audio:
          l.minutosAudio == null ? null : Math.round(l.minutosAudio * 100) / 100,
        custo_usd: Math.round(l.custoUSD * 1e6) / 1e6,
        ms: l.ms == null ? null : Math.round(l.ms),
        ms_primeira_palavra:
          l.msPrimeiraPalavra == null ? null : Math.round(l.msPrimeiraPalavra),
        id_requisicao: l.idRequisicao?.slice(0, 120) ?? null,
      });
      // Custo é registro, não pode derrubar o passo.
      if (error) console.error("[pipeline] ai_usage", { codigo: error.code });
    },

    async foiVista(historia) {
      const { data } = await db
        .from("stories")
        .select("vista_em")
        .eq("id", historia)
        .maybeSingle();
      return Boolean(data?.vista_em);
    },

    async avisoDoLivro(livro) {
      const [{ data: b }, { data: m }] = await Promise.all([
        db
          .from("books")
          .select("autor_nome, autor_apelido")
          .eq("id", livro)
          .maybeSingle(),
        db
          .from("book_members")
          .select("user_id")
          .eq("book_id", livro)
          .eq("papel", "responsavel")
          .maybeSingle(),
      ]);
      if (!b || !m) return null;
      const { data: u } = await db.auth.admin.getUserById(m.user_id);
      return {
        email: u.user?.email ?? null,
        apelido: b.autor_apelido?.trim() || b.autor_nome?.trim() || "seu livro",
      };
    },
  };
}
