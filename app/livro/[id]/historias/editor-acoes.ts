"use server";

// Ações do editor de histórias (prompt 8). Toda escrita do texto passa pelas funções do banco,
// que conferem a trava, o plano e o livro. Aqui: validação de formato, filtro explícito pelo
// livro e o registro de uso. Design: docs/designs/editor-historias.md.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import type { Marcacao } from "@/lib/ai/schemas";
import {
  MAX_FOTOS_HISTORIA,
  MAX_LETRAS_PARAGRAFO,
  MAX_PARAGRAFOS,
} from "@/lib/config";
import { paraSalvar, type TextoDaHistoria } from "@/lib/editor/conteudo";
import type { EstadoTrava, RespostaSalvar } from "@/lib/editor/tipos";
import { codigoDoErro, fraseDoErro } from "@/lib/erros-banco";
import type { Acao } from "@/lib/eventos-acoes";
import { registrarEvento } from "@/lib/eventos";
import { fotosDaHistoria } from "@/lib/historias/dados";
import type { FotoDaHistoria } from "@/lib/historias/tipos";
import { livroDaAcao, type LivroComAcesso } from "@/lib/livro/acesso";
import { fotosDoLivro } from "@/lib/livro/dados";
import type { FotoDaTela, Resposta } from "@/lib/livro/tipos";
import { clienteSessao } from "@/lib/supabase/servidor";
import type { Json } from "@/lib/supabase/tipos";

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

type Contexto = LivroComAcesso & {
  supabase: Awaited<ReturnType<typeof clienteSessao>>;
};

/** Livro do membro, com o plano ativo, e a história conferida como deste livro. */
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
  umaVezPorDia = false,
) {
  after(() =>
    registrarEvento(
      {
        quem: c.usuario.id,
        papel: c.livro.papel,
        acao,
        livro: c.livro.id,
        detalhes,
      },
      { umaVezPorDia },
    ),
  );
}

function atualizar(livroId: string) {
  revalidatePath(`/livro/${livroId}`, "layout");
}

// ── Trava ────────────────────────────────────────────────────────────────

export async function editar(
  livroId: string,
  historiaId: string,
  aba: string,
  opcoes: { pegar: boolean; assumir?: boolean },
): Promise<Resposta<EstadoTrava>> {
  if (!uuid.safeParse(aba).success) return ERRO;
  const c = await contexto(livroId, historiaId, opcoes.pegar);
  if (ehErro(c)) return c;
  const { data, error } = await c.supabase.rpc("editar_historia", {
    p_story: historiaId,
    p_aba: aba,
    p_pegar: opcoes.pegar,
    p_assumir: Boolean(opcoes.assumir),
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  const r = data?.[0];
  if (!r) return ERRO;
  return {
    ok: true,
    dados: { editando: r.editando, outraTela: r.outra_tela, nome: r.nome },
  };
}

export async function pararDeEditar(
  livroId: string,
  historiaId: string,
  aba: string,
): Promise<void> {
  if (!uuid.safeParse(aba).success) return;
  const c = await contexto(livroId, historiaId, false);
  if (ehErro(c)) return;
  await c.supabase.rpc("parar_de_editar", { p_story: historiaId, p_aba: aba });
}

// ── Salvar ───────────────────────────────────────────────────────────────

const esquemaTexto = z.object({
  titulo: z.string().max(400),
  ano: z.number().int().min(1850).max(2100).nullable(),
  paragrafos: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{1,40}$/),
        texto: z.string().max(MAX_LETRAS_PARAGRAFO),
        fontes: z.array(z.number().int().min(0).max(999999)).max(2000),
        editado: z.boolean(),
      }),
    )
    .min(1)
    .max(MAX_PARAGRAFOS),
  lacunas: z
    .array(
      z.object({ pergunta: z.string().max(500), motivo: z.string().max(500) }),
    )
    .max(20),
});

const esquemaMarcacoes = z
  .array(
    z.object({
      paragrafo: z.number().int().min(1),
      inicio: z.number().int().min(0),
      fim: z.number().int().min(0),
      trecho: z.string().max(MAX_LETRAS_PARAGRAFO),
      tipo: z.string().max(20),
      origem: z.enum(["checagem", "verificador"]),
      motivo: z.string().max(1000),
    }),
  )
  .max(500);

export async function salvar(
  livroId: string,
  historiaId: string,
  aba: string,
  rev: number,
  texto: TextoDaHistoria,
  marcacoes: Marcacao[],
): Promise<RespostaSalvar> {
  const t = esquemaTexto.safeParse(texto);
  const m = esquemaMarcacoes.safeParse(marcacoes);
  if (
    !uuid.safeParse(aba).success ||
    !Number.isInteger(rev) ||
    rev < 0 ||
    !t.success ||
    !m.success
  )
    return { ok: false, motivo: "outro", mensagem: ERRO.mensagem };
  const c = await contexto(livroId, historiaId);
  if (ehErro(c))
    return { ok: false, motivo: "outro", mensagem: c.ok ? "" : c.mensagem };
  const { data, error } = await c.supabase.rpc("salvar_historia", {
    p_story: historiaId,
    p_aba: aba,
    p_rev: rev,
    p_conteudo: paraSalvar(t.data as TextoDaHistoria) as unknown as Json,
    p_marcacoes: m.data as unknown as Json,
  });
  if (error) {
    const codigo = codigoDoErro(error);
    return {
      ok: false,
      motivo:
        codigo === "trava_de_outro"
          ? "trava"
          : codigo === "texto_desatualizado"
            ? "desatualizado"
            : "outro",
      mensagem: fraseDoErro(error),
    };
  }
  evento(c, "editou", { story: historiaId }, true);
  return { ok: true, rev: data as number };
}

// ── Restaurar e marcar como pronta ───────────────────────────────────────

export async function restaurar(
  livroId: string,
  historiaId: string,
  aba: string,
  numero: number,
): Promise<Resposta<{ rev: number }>> {
  if (!uuid.safeParse(aba).success || !Number.isInteger(numero) || numero < 1)
    return ERRO;
  const c = await contexto(livroId, historiaId);
  if (ehErro(c)) return c;
  const { data, error } = await c.supabase.rpc("restaurar_versao", {
    p_story: historiaId,
    p_aba: aba,
    p_numero: numero,
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  evento(c, "restaurou_versao", { story: historiaId, versao: numero });
  atualizar(livroId);
  return { ok: true, dados: { rev: data as number } };
}

export async function marcarPronta(
  livroId: string,
  historiaId: string,
  pronta: boolean,
): Promise<Resposta> {
  if (typeof pronta !== "boolean") return ERRO;
  const c = await contexto(livroId, historiaId);
  if (ehErro(c)) return c;
  const { error } = await c.supabase.rpc("marcar_historia_pronta", {
    p_story: historiaId,
    p_pronta: pronta,
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  evento(c, pronta ? "historia_revisada" : "historia_reaberta", {
    story: historiaId,
  });
  atualizar(livroId);
  return { ok: true };
}

// ── Fotos da história ────────────────────────────────────────────────────

export async function acervo(livroId: string): Promise<Resposta<FotoDaTela[]>> {
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  return { ok: true, dados: await fotosDoLivro(acesso.livro.id) };
}

export async function ligarFotos(
  livroId: string,
  historiaId: string,
  ids: string[],
): Promise<Resposta<{ fotos: FotoDaHistoria[] }>> {
  const v = z.array(uuid).min(1).max(MAX_FOTOS_HISTORIA).safeParse(ids);
  if (!v.success) return ERRO;
  const c = await contexto(livroId, historiaId);
  if (ehErro(c)) return c;
  const atuais = await fotosDaHistoria(c.livro.id, historiaId);
  const novas = v.data.filter((id) => !atuais.some((f) => f.id === id));
  if (atuais.length + novas.length > MAX_FOTOS_HISTORIA)
    return {
      ok: false,
      mensagem: fraseDoErro({ message: "cota_fotos_historia" }),
    };
  if (novas.length) {
    const { error } = await c.supabase.from("story_photos").insert(
      novas.map((photo_id, i) => ({
        story_id: historiaId,
        photo_id,
        book_id: c.livro.id,
        ordem: Math.min(atuais.length + i + 1, MAX_FOTOS_HISTORIA),
      })),
    );
    if (error) return { ok: false, mensagem: fraseDoErro(error) };
  }
  atualizar(livroId);
  return {
    ok: true,
    dados: { fotos: await fotosDaHistoria(c.livro.id, historiaId) },
  };
}

export async function tirarFoto(
  livroId: string,
  historiaId: string,
  foto: string,
): Promise<Resposta> {
  if (!uuid.safeParse(foto).success) return ERRO;
  const c = await contexto(livroId, historiaId);
  if (ehErro(c)) return c;
  const { error } = await c.supabase
    .from("story_photos")
    .delete()
    .eq("book_id", c.livro.id)
    .eq("story_id", historiaId)
    .eq("photo_id", foto);
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  atualizar(livroId);
  return { ok: true };
}

export async function legendar(
  livroId: string,
  historiaId: string,
  foto: string,
  legenda: string,
): Promise<Resposta> {
  const l = z.string().trim().max(300).safeParse(legenda);
  if (!uuid.safeParse(foto).success || !l.success) return ERRO;
  const c = await contexto(livroId, historiaId);
  if (ehErro(c)) return c;
  const { data, error } = await c.supabase
    .from("photos")
    .update({ legenda: l.data || null })
    .eq("book_id", c.livro.id)
    .eq("id", foto)
    .select("id");
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  if (!data?.length) return SEM_ACESSO;
  return { ok: true };
}
