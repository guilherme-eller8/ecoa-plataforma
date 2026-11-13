import "server-only";
// Leituras e escritas do pipeline com a chave secreta. Nunca recebe book_id de fora para
// decidir o livro: ele vem da gravação ou da história (as FKs compostas recusam mistura).
import { MAX_PERGUNTAS_SUGESTAO, MAX_RESUMOS_CONTEXTO } from "@/lib/config";
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

export function bancoPipeline(
  db: ClienteAdmin = clienteAdmin(),
): BancoPipeline {
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
      // Prompt 7: as gravações do contêiner, em ordem (o 1º passo de transcrição é a ordem 1).
      const { data: srs } = r?.historia
        ? await db
            .from("story_recordings")
            .select("recording_id, ordem")
            .eq("story_id", r.historia)
            .order("ordem")
        : { data: [] };
      return {
        historia: r?.historia ?? null,
        estado: (r?.estado ?? null) as EstadoHistoria | null,
        motivo: r?.motivo ?? null,
        livro: g?.book_id ?? null,
        gravacoes: (srs ?? []).map((x) => x.recording_id),
      };
    },

    async info(historia) {
      const { data } = await db
        .from("stories")
        .select(
          "book_id, estado, divisao, divisao_de, prompt_id, pergunta_sugerida, sugestao_ignorada",
        )
        .eq("id", historia)
        .maybeSingle();
      if (!data) return null;
      return {
        livro: data.book_id,
        estado: data.estado as EstadoHistoria,
        temDivisao: data.divisao !== null,
        divisaoDe: data.divisao_de,
        promptId: data.prompt_id,
        sugestaoDecidida: Boolean(
          data.pergunta_sugerida || data.sugestao_ignorada,
        ),
      };
    },

    async fixarSegmentoInicial(historia, gravacao) {
      const { data: srs, error } = await db
        .from("story_recordings")
        .select("recording_id, ordem")
        .eq("story_id", historia)
        .order("ordem");
      if (error) falhar("inicial", error);
      const lista = srs ?? [];
      const minha = lista.find((x) => x.recording_id === gravacao);
      if (!minha) return 1;
      const antes = lista
        .filter((x) => x.ordem < minha.ordem)
        .map((x) => x.recording_id);
      // Maior id já gravado nas anteriores (transcrição vazia não conta: o seguinte continua).
      let maior = 0;
      if (antes.length) {
        const { data: ts } = await db
          .from("transcripts")
          .select("segmentos")
          .in("recording_id", antes);
        for (const t of ts ?? [])
          for (const seg of (t.segmentos as Segmento[]) ?? [])
            if (seg.id > maior) maior = seg.id;
      }
      const inicial = maior + 1;
      const { error: e2 } = await db
        .from("story_recordings")
        .update({ segmento_inicial: inicial })
        .eq("story_id", historia)
        .eq("recording_id", gravacao);
      if (e2) falhar("inicial", e2);
      // Toca a história: um contêiner grande ainda transcrevendo não é "parado" pela varredura.
      await db
        .from("stories")
        .update({ atualizado_em: new Date().toISOString() })
        .eq("id", historia)
        .eq("estado", "ouvindo");
      return inicial;
    },

    async gravacoesDaHistoria(historia) {
      const { data: srs } = await db
        .from("story_recordings")
        .select("recording_id, ordem")
        .eq("story_id", historia)
        .order("ordem");
      const ids = (srs ?? []).map((x) => x.recording_id);
      if (!ids.length) return [];
      const { data: recs } = await db
        .from("recordings")
        .select("id, duracao_s, prompt_id")
        .in("id", ids);
      const perguntas = [
        ...new Set((recs ?? []).flatMap((r) => (r.prompt_id ? [r.prompt_id] : []))),
      ];
      const { data: ps } = perguntas.length
        ? await db.from("prompts").select("id, texto").in("id", perguntas)
        : { data: [] };
      const texto = new Map((ps ?? []).map((p) => [p.id, p.texto]));
      const rec = new Map((recs ?? []).map((r) => [r.id, r]));
      return (srs ?? []).map((x) => {
        const r = rec.get(x.recording_id);
        return {
          rotulo: `g${x.ordem}`,
          minutos: (r?.duracao_s ?? 0) / 60,
          pergunta: r?.prompt_id ? (texto.get(r.prompt_id) ?? null) : null,
          perguntaId: r?.prompt_id ?? null,
        };
      });
    },

    async perguntasPendentes(livro) {
      const { data } = await db
        .from("prompts")
        .select("id, texto")
        .eq("book_id", livro)
        .in("estado", ["para_enviar", "enviada"])
        .order("criado_em", { ascending: false })
        .limit(MAX_PERGUNTAS_SUGESTAO);
      return (data ?? []).map((p) => ({ id: p.id, texto: p.texto }));
    },

    async proporDivisao(historia, proposta) {
      const { data, error } = await db.rpc("servico_propor_divisao", {
        p_story: historia,
        p_proposta: json(proposta),
      });
      if (error) falhar("propor", error);
      return Boolean(data);
    },

    async sugerirPergunta(historia, pergunta) {
      const { data, error } = await db.rpc("servico_sugerir_pergunta", {
        p_story: historia,
        p_prompt: pergunta,
      });
      if (error) falhar("sugerir", error);
      return Boolean(data);
    },

    async gravacaoParaTranscrever(gravacao, historia) {
      const { data: sr } = await db
        .from("story_recordings")
        .select("segmento_inicial, ordem")
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
        rotulo: `g${sr.ordem}`,
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
        .select("recording_id, ordem, segmentos")
        .eq("story_id", historia)
        .order("ordem");
      if (error) falhar("segmentos", error);
      const lista = srs ?? [];
      if (lista.length === 0) return [];
      const { data: ts } = await db
        .from("transcripts")
        .select("recording_id, segmentos")
        .in(
          "recording_id",
          lista.map((s) => s.recording_id),
        );
      const porId = new Map(
        (ts ?? []).map((t) => [t.recording_id, t.segmentos as Segmento[]]),
      );
      // Prompt 7: a história usa só os segmentos dela (null = a gravação inteira).
      return lista.flatMap((sr) => {
        const todos = porId.get(sr.recording_id) ?? [];
        if (!sr.segmentos) return todos;
        const meus = new Set(sr.segmentos);
        return todos.filter((x) => meus.has(x.id));
      });
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
          l.minutosAudio == null
            ? null
            : Math.round(l.minutosAudio * 100) / 100,
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
