"use server";

// Ações das propostas da IA (prompt 9). Toda escrita passa pelas funções do banco, que conferem
// a trava, o plano, o consentimento, os tetos e (no aceite) que nenhum parágrafo editado à mão
// mudou. Aqui: formato, conversão de posições, composição do texto final e o registro de uso.
// Design: docs/designs/ia-sob-controle.md.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import type { Marcacao } from "@/lib/ai/schemas";
import { INSTRUCAO_MAX } from "@/lib/config";
import { normalizarTexto, type Paragrafo } from "@/lib/editor/conteudo";
import {
  comporProposta,
  paraPontos,
  type MarcacaoProposta,
  type Mudanca,
} from "@/lib/editor/propostas";
import type { PedidoDeTrecho, PropostaDaTela } from "@/lib/editor/tipos";
import { fraseDoErro } from "@/lib/erros-banco";
import type { Acao } from "@/lib/eventos-acoes";
import { registrarEvento } from "@/lib/eventos";
import { propostasDoEditor } from "@/lib/historias/dados";
import { dependencias } from "@/lib/inngest/funcoes";
import { livroDaAcao, type LivroComAcesso } from "@/lib/livro/acesso";
import type { Resposta } from "@/lib/livro/tipos";
import { dispararProposta } from "@/lib/pipeline/disparo";
import { logarSemTexto } from "@/lib/pipeline/erros";
import { revisarTrecho as rodarRevisao } from "@/lib/pipeline/propostas";
import { clienteSessao } from "@/lib/supabase/servidor";
import type { Json } from "@/lib/supabase/tipos";
import { CHAVES_TAMANHO, type ChaveTamanho } from "@/lib/ui/tamanho";

const uuid = z.uuid();
const ERRO = {
  ok: false as const,
  mensagem: "Não deu certo agora. Tente de novo.",
};
const SEM_ACESSO = {
  ok: false as const,
  mensagem: "Você não tem acesso a este livro.",
};
const FECHADO = {
  ok: false as const,
  mensagem: "Este livro não aceita mudanças agora.",
};

type Sessao = Awaited<ReturnType<typeof clienteSessao>>;
type Contexto = LivroComAcesso & { supabase: Sessao };

async function contexto(
  livroId: string,
  historiaId: string,
  escrever = true,
): Promise<Contexto | Resposta<never>> {
  if (!uuid.safeParse(historiaId).success) return ERRO;
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  if (escrever && !acesso.podeEscrever) return FECHADO;
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("stories")
    .select("id")
    .eq("book_id", acesso.livro.id)
    .eq("id", historiaId)
    .maybeSingle();
  if (!data) return SEM_ACESSO;
  return { ...acesso, supabase };
}

const ehErro = (x: Contexto | Resposta<never>): x is Resposta<never> =>
  "ok" in x;

function evento(
  c: Contexto,
  acao: Acao,
  detalhes: Record<string, string | number | boolean | null>,
) {
  after(() =>
    registrarEvento({
      quem: c.usuario.id,
      papel: c.livro.papel,
      acao,
      livro: c.livro.id,
      detalhes,
    }),
  );
}

const COLUNAS =
  "id, tipo, estado, tamanho, pedido, mudancas, ordem, marcacoes, erro, pedida_em" as const;

type Linha = {
  id: string;
  tipo: PropostaDaTela["tipo"];
  estado: PropostaDaTela["estado"];
  tamanho: string;
  pedido: Json;
  mudancas: Json | null;
  ordem: string[] | null;
  marcacoes: Json;
  erro: string | null;
  pedida_em: string;
};

function daLinha(l: Linha): PropostaDaTela {
  return {
    id: l.id,
    tipo: l.tipo,
    estado: l.estado,
    tamanho: (CHAVES_TAMANHO as readonly string[]).includes(l.tamanho)
      ? (l.tamanho as ChaveTamanho)
      : "medio",
    pedido: (l.pedido ?? {}) as PropostaDaTela["pedido"],
    mudancas: (l.mudancas ?? []) as unknown as Mudanca[],
    ordem: l.ordem,
    marcacoes: (l.marcacoes ?? []) as unknown as MarcacaoProposta[],
    erro: l.erro,
    pedidaEm: l.pedida_em,
  };
}

async function lerProposta(c: Contexto, historiaId: string, id: string) {
  const { data } = await c.supabase
    .from("story_proposals")
    .select(COLUNAS)
    .eq("book_id", c.livro.id)
    .eq("story_id", historiaId)
    .eq("id", id)
    .maybeSingle();
  return data ? daLinha(data as Linha) : null;
}

/** Texto atual da história e os grifos, como o editor os vê. */
async function textoAtual(
  c: Contexto,
  historiaId: string,
): Promise<{ paragrafos: Paragrafo[]; marcacoes: Marcacao[] }> {
  const { data: s } = await c.supabase
    .from("stories")
    .select("texto, texto_marcacoes")
    .eq("book_id", c.livro.id)
    .eq("id", historiaId)
    .maybeSingle();
  if (s?.texto)
    return {
      paragrafos: normalizarTexto(s.texto).paragrafos,
      marcacoes: (s.texto_marcacoes ?? []) as unknown as Marcacao[],
    };
  const { data: v } = await c.supabase
    .from("story_versions")
    .select("conteudo, marcacoes")
    .eq("story_id", historiaId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    paragrafos: normalizarTexto(v?.conteudo ?? null).paragrafos,
    marcacoes: (v?.marcacoes ?? []) as unknown as Marcacao[],
  };
}

async function pedir(
  c: Contexto,
  historiaId: string,
  aba: string,
  tipo: PropostaDaTela["tipo"],
  tamanho: string | null,
  pedido: Record<string, unknown>,
): Promise<Resposta<string>> {
  const { data, error } = await c.supabase.rpc("pedir_proposta", {
    p_story: historiaId,
    p_aba: aba,
    p_tipo: tipo,
    p_tamanho: tamanho,
    p_pedido: pedido as Json,
  });
  if (error || !data)
    return {
      ok: false,
      mensagem:
        error?.message === "sem_consentimento"
          ? "Confirme o uso da IA nas Configurações do livro."
          : fraseDoErro(error),
    };
  evento(c, "pediu_proposta", { story: historiaId, tipo });
  return { ok: true, dados: data as string };
}

// ── Pedir ────────────────────────────────────────────────────────────────

export async function pedirTamanho(
  livroId: string,
  historiaId: string,
  aba: string,
  tamanho: ChaveTamanho,
): Promise<Resposta<PropostaDaTela>> {
  if (
    !uuid.safeParse(aba).success ||
    !(CHAVES_TAMANHO as readonly string[]).includes(tamanho)
  )
    return ERRO;
  const c = await contexto(livroId, historiaId);
  if (ehErro(c)) return c;
  const r = await pedir(c, historiaId, aba, "tamanho", tamanho, {});
  if (!r.ok) return r;
  after(() => dispararProposta(r.dados, historiaId));
  const p = await lerProposta(c, historiaId, r.dados);
  return p ? { ok: true, dados: p } : ERRO;
}

export async function usarAudio(
  livroId: string,
  historiaId: string,
  aba: string,
): Promise<Resposta<PropostaDaTela>> {
  if (!uuid.safeParse(aba).success) return ERRO;
  const c = await contexto(livroId, historiaId);
  if (ehErro(c)) return c;
  const r = await pedir(c, historiaId, aba, "audio", null, {});
  if (!r.ok) return r;
  after(() => dispararProposta(r.dados, historiaId));
  const p = await lerProposta(c, historiaId, r.dados);
  return p ? { ok: true, dados: p } : ERRO;
}

const esquemaTrecho = z.object({
  paragrafo: z.string().regex(/^[a-z0-9-]{1,40}$/),
  inicio: z.number().int().min(0).max(99999),
  fim: z.number().int().min(1).max(99999),
  instrucao: z.enum(["curto", "fiel", "corrigir", "livre"]),
  texto: z.string().trim().min(1).max(INSTRUCAO_MAX).optional(),
});

/** Revisar trecho: roda aqui mesmo (10 a 30 s), sem fila; a proposta volta pronta. */
export async function revisarTrecho(
  livroId: string,
  historiaId: string,
  aba: string,
  pedido: PedidoDeTrecho,
): Promise<Resposta<PropostaDaTela>> {
  const v = esquemaTrecho.safeParse(pedido);
  if (
    !uuid.safeParse(aba).success ||
    !v.success ||
    v.data.fim <= v.data.inicio ||
    (v.data.instrucao === "livre") !== Boolean(v.data.texto)
  )
    return ERRO;
  const c = await contexto(livroId, historiaId);
  if (ehErro(c)) return c;
  // A tela conta em UTF-16; o banco, em pontos de código (emoji ocupa 2 na tela, 1 no banco).
  const { paragrafos } = await textoAtual(c, historiaId);
  const alvo = paragrafos.find((p) => p.id === v.data.paragrafo);
  if (!alvo || v.data.fim > alvo.texto.length)
    return {
      ok: false,
      mensagem: fraseDoErro({ message: "proposta_vencida" }),
    };
  const r = await pedir(c, historiaId, aba, "trecho", null, {
    paragrafo: v.data.paragrafo,
    inicio: paraPontos(alvo.texto, v.data.inicio),
    fim: paraPontos(alvo.texto, v.data.fim),
    instrucao: v.data.instrucao,
    ...(v.data.instrucao === "livre" ? { texto: v.data.texto } : {}),
  });
  if (!r.ok) return r;
  try {
    await rodarRevisao(r.dados, dependencias());
  } catch (e) {
    logarSemTexto("revisar", e);
    return {
      ok: false,
      mensagem: "A IA não conseguiu revisar agora. Tente de novo.",
    };
  }
  const p = await lerProposta(c, historiaId, r.dados);
  return p ? { ok: true, dados: p } : ERRO;
}

// ── Ler, aceitar, descartar ──────────────────────────────────────────────

export async function pendentes(
  livroId: string,
  historiaId: string,
): Promise<Resposta<PropostaDaTela[]>> {
  const c = await contexto(livroId, historiaId, false);
  if (ehErro(c)) return c;
  return {
    ok: true,
    dados: (await propostasDoEditor(c.supabase, c.livro.id, historiaId))
      .propostas,
  };
}

export async function aplicarProposta(
  livroId: string,
  historiaId: string,
  aba: string,
  rev: number,
  propostaId: string,
  aceitas: string[],
): Promise<
  Resposta<{ rev: number; paragrafos: Paragrafo[]; marcacoes: Marcacao[] }>
> {
  const a = z
    .array(z.string().regex(/^m[0-9]{1,4}$/))
    .min(1)
    .max(400)
    .safeParse(aceitas);
  if (
    !uuid.safeParse(aba).success ||
    !uuid.safeParse(propostaId).success ||
    !Number.isInteger(rev) ||
    rev < 0 ||
    !a.success
  )
    return ERRO;
  const c = await contexto(livroId, historiaId);
  if (ehErro(c)) return c;
  const p = await lerProposta(c, historiaId, propostaId);
  if (!p || p.estado !== "pronta")
    return {
      ok: false,
      mensagem: fraseDoErro({ message: "proposta_indisponivel" }),
    };
  // A mesma função pura da prévia monta o texto; o banco confere tudo de novo.
  const atual = await textoAtual(c, historiaId);
  const final = comporProposta(atual.paragrafos, atual.marcacoes, p, a.data);
  if (!final.aplicadas.length)
    return {
      ok: false,
      mensagem: fraseDoErro({ message: "proposta_vencida" }),
    };
  const { data, error } = await c.supabase.rpc("aplicar_proposta", {
    p_story: historiaId,
    p_aba: aba,
    p_rev: rev,
    p_proposta: propostaId,
    p_aplicadas: final.aplicadas,
    p_conteudo: { paragrafos: final.paragrafos } as unknown as Json,
    p_marcacoes: final.marcacoes as unknown as Json,
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  evento(c, "aplicou_proposta", {
    story: historiaId,
    tipo: p.tipo,
    aceitas: final.aplicadas.length,
    total: p.mudancas.length,
  });
  revalidatePath(`/livro/${livroId}`, "layout");
  return {
    ok: true,
    dados: {
      rev: data as number,
      paragrafos: final.paragrafos,
      marcacoes: final.marcacoes,
    },
  };
}

export async function descartarProposta(
  livroId: string,
  historiaId: string,
  aba: string,
  propostaId: string,
): Promise<Resposta> {
  if (!uuid.safeParse(aba).success || !uuid.safeParse(propostaId).success)
    return ERRO;
  const c = await contexto(livroId, historiaId);
  if (ehErro(c)) return c;
  const { data: p } = await c.supabase
    .from("story_proposals")
    .select("tipo")
    .eq("id", propostaId)
    .eq("story_id", historiaId)
    .maybeSingle();
  const { error } = await c.supabase.rpc("descartar_proposta", {
    p_story: historiaId,
    p_aba: aba,
    p_proposta: propostaId,
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  evento(c, "descartou_proposta", { story: historiaId, tipo: p?.tipo ?? null });
  return { ok: true };
}
