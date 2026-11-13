"use server";

// Ações do responsável. Toda ação:
// 1. confere o livro pela sessão (livroDaAcao: membro, filtro explícito além da RLS);
// 2. escreve com o cliente da sessão (a RLS e as funções enquete_* conferem de novo);
// 3. registra o evento depois da resposta.
// A chave secreta só assina URLs do Storage, depois de conferir o caminho com a regex do banco.

import { dispararSeRecebida } from "@/lib/pipeline/disparo";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { fotoDoLivro, caminhoFoto } from "@/lib/arquivos";
import {
  audioDoLivro,
  caminhoAudio,
  formatoDoArquivo,
  MAX_AUDIO_BYTES,
} from "@/lib/audios/formatos";
import {
  MAX_ARQUIVOS_LOTE,
  MAX_FOTOS_POR_ENVIO,
  MAX_ITENS_ENQUETE,
  MAX_FOTOS_POR_LIVRO,
  TEXTO_PERGUNTA_MAX,
} from "@/lib/config";
import { envLinks } from "@/lib/env-links";
import { fraseDoErro } from "@/lib/erros-banco";
import type { Acao } from "@/lib/eventos-acoes";
import { registrarEvento } from "@/lib/eventos";
import { hashDoToken, tokenDoLink, urlAutor, urlFamilia } from "@/lib/links";
import {
  livroDaAcao,
  configuracaoDo,
  type LivroComAcesso,
} from "@/lib/livro/acesso";
import {
  marcar,
  PASSOS,
  type EstadoPasso,
  type Passo,
} from "@/lib/livro/configuracao";
import type {
  AudioParaSubir,
  OpcoesAudios,
  OrigemAudio,
  AudioPreparado,
  CandidatoDaEnquete,
  FotoPreparada,
  FotoSubida,
  Resposta,
} from "@/lib/livro/tipos";
import { perguntaPorId } from "@/lib/perguntas/banco";
import { normalizarCelular } from "@/lib/telefone";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";
import {
  PARENTESCOS,
  type Json,
  type Parentesco,
  type PromptEstado,
  type PromptTipo,
} from "@/lib/supabase/tipos";

const SEM_ACESSO = {
  ok: false as const,
  mensagem: "Você não tem acesso a este livro.",
};
const FECHADO = {
  ok: false as const,
  mensagem: "Este livro não aceita mudanças agora.",
};
const uuid = z.uuid();
const tipo = z.enum(["pergunta", "causo"]);
const texto = z.string().trim().min(3).max(TEXTO_PERGUNTA_MAX);

type Contexto = LivroComAcesso & {
  supabase: Awaited<ReturnType<typeof clienteSessao>>;
};

/** Abre o livro para escrita ou devolve a resposta de erro pronta. */
async function paraEscrever(
  livroId: string,
): Promise<Contexto | Resposta<never>> {
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  if (!acesso.podeEscrever) return FECHADO;
  return { ...acesso, supabase: await clienteSessao() };
}

function ehErro(x: Contexto | Resposta<never>): x is Resposta<never> {
  return "ok" in x;
}

function evento(
  c: Contexto,
  acao: Acao,
  detalhes?: Record<string, string | number | boolean | null>,
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

function falhou(
  erro: { message?: string | null; code?: string | null } | null,
) {
  return { ok: false as const, mensagem: fraseDoErro(erro) };
}

function atualizar(livroId: string) {
  revalidatePath(`/livro/${livroId}`, "layout");
}

// ── Configuração inicial ─────────────────────────────────────────────────

const esquemaQuem = z.object({
  nome: z.string().trim().min(1, "Escreva o nome.").max(120),
  apelido: z.string().trim().max(60),
  celular: z.string().max(30),
  parentesco: z.enum(PARENTESCOS as [Parentesco, ...Parentesco[]]).nullable(),
});

async function gravarConfiguracao(
  c: Contexto,
  passo: Passo,
  estado: EstadoPasso,
) {
  const configuracao = marcar(configuracaoDo(c.livro), passo, estado) as Json;
  return c.supabase
    .from("books")
    .update({ configuracao })
    .eq("id", c.livro.id)
    .select("id");
}

export async function salvarQuem(
  livroId: string,
  dados: {
    nome: string;
    apelido: string;
    celular: string;
    parentesco: Parentesco | null;
  },
): Promise<Resposta> {
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const v = esquemaQuem.safeParse(dados);
  if (!v.success)
    return {
      ok: false,
      mensagem: v.error.issues[0]?.message ?? "Confira o nome.",
    };
  const celular = normalizarCelular(v.data.celular);
  if (celular === undefined)
    return { ok: false, mensagem: "Confira o celular: DDD e número." };
  const configuracao = marcar(configuracaoDo(c.livro), "quem", "feito") as Json;
  const { data, error } = await c.supabase
    .from("books")
    .update({
      autor_nome: v.data.nome,
      autor_apelido: v.data.apelido || null,
      autor_celular: celular,
      autor_parentesco: v.data.parentesco,
      configuracao,
    })
    .eq("id", c.livro.id)
    .select("id");
  if (error) return falhou(error);
  if (!data?.length) return FECHADO;
  evento(c, "configurou", { passo: "quem" });
  atualizar(livroId);
  return { ok: true };
}

export async function marcarPasso(
  livroId: string,
  passo: Passo,
  estado: EstadoPasso,
): Promise<Resposta> {
  if (
    !PASSOS.includes(passo) ||
    !["feito", "pulado", "depois"].includes(estado)
  )
    return { ok: false, mensagem: "Passo inválido." };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { data, error } = await gravarConfiguracao(c, passo, estado);
  if (error) return falhou(error);
  if (!data?.length) return FECHADO;
  evento(c, "configurou", { passo, estado });
  atualizar(livroId);
  return { ok: true };
}

/** Insere perguntas do banco que ainda não estão no livro, e as próprias. */
async function inserirPerguntas(
  c: Contexto,
  bancoIds: string[],
  proprias: { tipo: PromptTipo; texto: string }[],
) {
  const validosDoBanco = [...new Set(bancoIds)].filter((id) =>
    perguntaPorId(id),
  );
  const { data: existentes, error: erroLeitura } = await c.supabase
    .from("prompts")
    .select("banco_id")
    .eq("book_id", c.livro.id)
    .not("banco_id", "is", null);
  if (erroLeitura) return { error: erroLeitura, salvas: 0 };
  const jaTem = new Set((existentes ?? []).map((p) => p.banco_id));
  const linhas = [
    ...validosDoBanco
      .filter((id) => !jaTem.has(id))
      .map((id) => ({
        book_id: c.livro.id,
        tipo: "pergunta" as const,
        texto: perguntaPorId(id)!.texto,
        origem: "banco" as const,
        banco_id: id,
      })),
    ...proprias.map((p) => ({
      book_id: c.livro.id,
      tipo: p.tipo,
      texto: p.texto,
      origem: "propria" as const,
    })),
  ];
  if (linhas.length === 0) return { error: null, salvas: 0 };
  const { data, error } = await c.supabase
    .from("prompts")
    .insert(linhas)
    .select("id");
  return { error, salvas: data?.length ?? 0 };
}

const esquemaPerguntas = z.object({
  bancoIds: z.array(z.string().max(20)).max(150),
  proprias: z.array(z.object({ tipo, texto })).max(30),
});

export async function salvarPerguntas(
  livroId: string,
  dados: {
    bancoIds: string[];
    proprias: { tipo: PromptTipo; texto: string }[];
  },
): Promise<Resposta<{ salvas: number }>> {
  const v = esquemaPerguntas.safeParse(dados);
  if (!v.success)
    return { ok: false, mensagem: "Uma pergunta está curta ou longa demais." };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const r = await inserirPerguntas(c, v.data.bancoIds, v.data.proprias);
  if (r.error) return falhou(r.error);
  const { error } = await gravarConfiguracao(c, "perguntas", "feito");
  if (error) return falhou(error);
  evento(c, "adicionou_pergunta", {
    quantas: r.salvas,
    origem: "configuracao",
  });
  atualizar(livroId);
  return { ok: true, dados: { salvas: r.salvas } };
}

// ── Fotos ────────────────────────────────────────────────────────────────

export async function prepararFotos(
  livroId: string,
  quantidade: number,
): Promise<Resposta<FotoPreparada[]>> {
  if (
    !Number.isInteger(quantidade) ||
    quantidade < 1 ||
    quantidade > MAX_FOTOS_POR_ENVIO
  )
    return {
      ok: false,
      mensagem: `Escolha até ${MAX_FOTOS_POR_ENVIO} fotos por vez.`,
    };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { count } = await c.supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("book_id", c.livro.id);
  if ((count ?? 0) + quantidade > MAX_FOTOS_POR_LIVRO)
    return { ok: false, mensagem: "O acervo chegou ao limite de fotos." };
  const storage = clienteAdmin().storage.from("acervo");
  const preparadas: FotoPreparada[] = [];
  for (let i = 0; i < quantidade; i++) {
    const caminho = caminhoFoto(c.livro.id);
    const { data, error } = await storage.createSignedUploadUrl(caminho);
    if (error || !data) return falhou(null);
    preparadas.push({ caminho, token: data.token });
  }
  return { ok: true, dados: preparadas };
}

const esquemaFotos = z
  .array(
    z.object({
      caminho: z.string().max(200),
      largura: z.number().int().min(1).max(10000),
      altura: z.number().int().min(1).max(10000),
    }),
  )
  .min(1)
  .max(MAX_FOTOS_POR_ENVIO);

export async function registrarFotos(
  livroId: string,
  fotos: FotoSubida[],
  opcoes: { doAutor?: boolean } = {},
): Promise<Resposta<{ ids: string[] }>> {
  const v = esquemaFotos.safeParse(fotos);
  if (!v.success || !v.data.every((f) => fotoDoLivro(f.caminho, livroId)))
    return { ok: false, mensagem: "Não deu certo agora. Tente de novo." };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { data, error } = await c.supabase
    .from("photos")
    .insert(v.data.map((f) => ({ book_id: c.livro.id, ...f })))
    .select("id");
  if (error) return falhou(error);
  const ids = (data ?? []).map((f) => f.id);
  if (opcoes.doAutor && ids[0]) {
    const r = await c.supabase
      .from("books")
      .update({ autor_foto_id: ids[0] })
      .eq("id", c.livro.id)
      .select("id");
    if (r.error) return falhou(r.error);
  }
  evento(c, "subiu_fotos", { quantas: ids.length });
  atualizar(livroId);
  return { ok: true, dados: { ids } };
}

// ── Perguntas ────────────────────────────────────────────────────────────

export async function adicionarDoBanco(
  livroId: string,
  bancoIds: string[],
): Promise<Resposta<{ salvas: number }>> {
  const v = z.array(z.string().max(20)).min(1).max(150).safeParse(bancoIds);
  if (!v.success) return { ok: false, mensagem: "Escolha pelo menos uma." };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const r = await inserirPerguntas(c, v.data, []);
  if (r.error) return falhou(r.error);
  evento(c, "adicionou_pergunta", { quantas: r.salvas, origem: "banco" });
  atualizar(livroId);
  return { ok: true, dados: { salvas: r.salvas } };
}

export async function adicionarPropria(
  livroId: string,
  dados: { tipo: PromptTipo; texto: string; fotoId?: string | null },
): Promise<Resposta> {
  const v = z
    .object({ tipo, texto, fotoId: uuid.nullable().optional() })
    .safeParse(dados);
  if (!v.success)
    return {
      ok: false,
      mensagem: `Escreva de 3 a ${TEXTO_PERGUNTA_MAX} letras.`,
    };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { error } = await c.supabase.from("prompts").insert({
    book_id: c.livro.id,
    tipo: v.data.tipo,
    texto: v.data.texto,
    origem: "propria",
    photo_id: v.data.fotoId ?? null,
  });
  if (error) return falhou(error);
  evento(c, "adicionou_pergunta", {
    quantas: 1,
    origem: v.data.fotoId ? "foto" : "propria",
  });
  atualizar(livroId);
  return { ok: true };
}

const ESTADOS_DA_TELA: PromptEstado[] = ["para_enviar", "enviada", "pulada"];

export async function mudarEstado(
  livroId: string,
  pergunta: string,
  estado: PromptEstado,
): Promise<Resposta> {
  if (!uuid.safeParse(pergunta).success || !ESTADOS_DA_TELA.includes(estado))
    return { ok: false, mensagem: "Essa mudança não é possível." };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { data, error } = await c.supabase
    .from("prompts")
    .update({ estado })
    .eq("id", pergunta)
    .eq("book_id", c.livro.id)
    .select("id");
  if (error) return falhou(error);
  if (!data?.length) return FECHADO;
  if (estado === "enviada") evento(c, "enviou_pergunta");
  atualizar(livroId);
  return { ok: true };
}

export async function apagar(
  livroId: string,
  pergunta: string,
): Promise<Resposta> {
  if (!uuid.safeParse(pergunta).success)
    return { ok: false, mensagem: "Pergunta inválida." };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { data, error } = await c.supabase
    .from("prompts")
    .delete()
    .eq("id", pergunta)
    .eq("book_id", c.livro.id)
    .select("id");
  if (error) return falhou(error);
  if (!data?.length)
    return {
      ok: false,
      mensagem: "Só dá para apagar o que ainda não foi enviado.",
    };
  atualizar(livroId);
  return { ok: true };
}

// ── Causos ───────────────────────────────────────────────────────────────

export async function virarPergunta(
  livroId: string,
  causo: string,
  textoDaPergunta: string,
): Promise<Resposta> {
  const v = z
    .object({ causo: uuid, texto })
    .safeParse({ causo, texto: textoDaPergunta });
  if (!v.success)
    return {
      ok: false,
      mensagem: `Escreva de 3 a ${TEXTO_PERGUNTA_MAX} letras.`,
    };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { data: sugestao } = await c.supabase
    .from("causos")
    .select("tipo")
    .eq("id", v.data.causo)
    .eq("book_id", c.livro.id)
    .maybeSingle();
  if (!sugestao) return { ok: false, mensagem: "Sugestão não encontrada." };
  const { error } = await c.supabase.from("prompts").insert({
    book_id: c.livro.id,
    tipo: sugestao.tipo,
    texto: v.data.texto,
    origem: "causo",
    causo_id: v.data.causo,
  });
  if (error) return falhou(error);
  await c.supabase
    .from("causos")
    .update({ estado: "virou_pergunta" })
    .eq("id", v.data.causo)
    .eq("book_id", c.livro.id);
  evento(c, "virou_pergunta");
  atualizar(livroId);
  return { ok: true };
}

/** Texto do candidato a partir da sugestão: o texto dela (até 500) ou um pedido pelo áudio. */
function textoDoCauso(c: {
  nome: string;
  texto: string | null;
  tipo: "pergunta" | "causo";
}) {
  const t = c.texto?.trim();
  if (t && t.length >= 3) return t.slice(0, TEXTO_PERGUNTA_MAX);
  return (
    c.tipo === "pergunta"
      ? `Pergunta de ${c.nome} (ouça o áudio).`
      : `Conte a história que ${c.nome} pediu.`
  ).slice(0, TEXTO_PERGUNTA_MAX);
}

export async function porNaEnquete(
  livroId: string,
  causo: string,
): Promise<Resposta<{ adicionado: boolean }>> {
  if (!uuid.safeParse(causo).success)
    return { ok: false, mensagem: "Causo inválido." };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const [{ data: dados }, { data: aberta }] = await Promise.all([
    c.supabase
      .from("causos")
      .select("id, nome, texto, tipo")
      .eq("id", causo)
      .eq("book_id", c.livro.id)
      .maybeSingle(),
    c.supabase
      .from("polls")
      .select("id")
      .eq("book_id", c.livro.id)
      .eq("estado", "aberta")
      .maybeSingle(),
  ]);
  if (!dados) return { ok: false, mensagem: "Causo não encontrado." };
  if (!aberta) return { ok: true, dados: { adicionado: false } }; // a tela abre "Nova enquete"
  const { error } = await c.supabase.rpc("enquete_adicionar_item", {
    p_enquete: aberta.id,
    p_item: {
      texto: textoDoCauso(dados),
      tipo: dados.tipo,
      causo_id: dados.id,
    },
  });
  if (error) return falhou(error);
  atualizar(livroId);
  return { ok: true, dados: { adicionado: true } };
}

/** URL do áudio do causo, pedida no toque em Ouvir. */
export async function urlDoAudio(
  livroId: string,
  causo: string,
): Promise<Resposta<{ url: string }>> {
  if (!uuid.safeParse(causo).success)
    return { ok: false, mensagem: "Causo inválido." };
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("causos")
    .select("audio_caminho, audio_recebido_em")
    .eq("id", causo)
    .eq("book_id", livroId)
    .maybeSingle();
  if (!data?.audio_caminho || !data.audio_recebido_em)
    return { ok: false, mensagem: "Este causo não tem áudio." };
  const { data: assinada } = await clienteAdmin()
    .storage.from("causos")
    .createSignedUrl(data.audio_caminho, 60 * 60);
  if (!assinada) return falhou(null);
  return { ok: true, dados: { url: assinada.signedUrl } };
}

// ── Enquete ──────────────────────────────────────────────────────────────

const esquemaCandidatos = z
  .array(
    z.object({
      texto,
      tipo,
      banco_id: z
        .string()
        .regex(/^[a-z]+-[0-9]{2,3}$/)
        .optional(),
      causo_id: uuid.optional(),
    }),
  )
  .min(2)
  .max(MAX_ITENS_ENQUETE);

export async function abrirEnquete(
  livroId: string,
  candidatos: CandidatoDaEnquete[],
): Promise<Resposta> {
  const v = esquemaCandidatos.safeParse(candidatos);
  if (!v.success)
    return {
      ok: false,
      mensagem: `Escolha de 2 a ${MAX_ITENS_ENQUETE} perguntas.`,
    };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { error } = await c.supabase.rpc("enquete_abrir", {
    p_livro: c.livro.id,
    p_itens: v.data as unknown as Json,
  });
  if (error) return falhou(error);
  evento(c, "abriu_enquete", { itens: v.data.length });
  atualizar(livroId);
  return { ok: true };
}

export async function encerrarEnquete(
  livroId: string,
  enquete: string,
): Promise<Resposta> {
  if (!uuid.safeParse(enquete).success)
    return { ok: false, mensagem: "Enquete inválida." };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { error } = await c.supabase.rpc("enquete_encerrar", {
    p_enquete: enquete,
  });
  if (error) return falhou(error);
  evento(c, "encerrou_enquete");
  atualizar(livroId);
  return { ok: true };
}

export async function salvarDaEnquete(
  livroId: string,
  enquete: string,
  itens: string[],
): Promise<Resposta<{ salvas: number }>> {
  const v = z
    .object({ enquete: uuid, itens: z.array(uuid).min(1).max(30) })
    .safeParse({ enquete, itens });
  if (!v.success) return { ok: false, mensagem: "Escolha pelo menos uma." };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { data, error } = await c.supabase.rpc("enquete_salvar", {
    p_enquete: v.data.enquete,
    p_itens: v.data.itens,
  });
  if (error) return falhou(error);
  evento(c, "enquete_salvou", { quantas: data ?? 0 });
  atualizar(livroId);
  return { ok: true, dados: { salvas: data ?? 0 } };
}

export async function removerVotos(
  livroId: string,
  enquete: string,
  votante: string,
): Promise<Resposta> {
  if (!uuid.safeParse(enquete).success || !uuid.safeParse(votante).success)
    return { ok: false, mensagem: "Voto inválido." };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { error } = await c.supabase.rpc("enquete_remover_votos", {
    p_enquete: enquete,
    p_votante: votante,
  });
  if (error) return falhou(error);
  evento(c, "removeu_voto");
  atualizar(livroId);
  return { ok: true };
}

// ── Link da família ──────────────────────────────────────────────────────

async function novoLinkDaFamilia(
  c: Contexto,
): Promise<Resposta<{ url: string }>> {
  const env = envLinks();
  const id = crypto.randomUUID();
  const token = tokenDoLink("familia", id, env.versaoAtual, env);
  const { error } = await clienteAdmin().rpc("servico_trocar_link_familia", {
    p_livro: c.livro.id,
    p_usuario: c.usuario.id,
    p_id: id,
    p_token_hash: hashDoToken(token),
    p_chave_versao: env.versaoAtual,
  });
  if (error) return falhou(error);
  return { ok: true, dados: { url: urlFamilia(token) } };
}

/** Devolve o link ativo; se ainda não existe, cria. */
export async function pegarLinkDaFamilia(
  livroId: string,
): Promise<Resposta<{ url: string }>> {
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { data } = await c.supabase
    .from("family_access")
    .select("id, chave_versao")
    .eq("book_id", c.livro.id)
    .is("revogado_em", null)
    .maybeSingle();
  if (data)
    return {
      ok: true,
      dados: {
        url: urlFamilia(tokenDoLink("familia", data.id, data.chave_versao)),
      },
    };
  const r = await novoLinkDaFamilia(c);
  if (r.ok) evento(c, "gerou_link_familia");
  atualizar(livroId);
  return r;
}

/** Troca o link: o antigo para de funcionar na hora. */
export async function trocarLinkDaFamilia(
  livroId: string,
): Promise<Resposta<{ url: string }>> {
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const r = await novoLinkDaFamilia(c);
  if (r.ok) evento(c, "trocou_link_familia");
  atualizar(livroId);
  return r;
}

// ── Link do autor (prompt 5) ────────────────────────────────────────────
// Mesmo modelo do link da família (T25): o banco guarda só o hash; o servidor recalcula o
// token do id e da versão para mostrar o link de novo.

async function novoLinkDoAutor(
  c: Contexto,
): Promise<Resposta<{ url: string }>> {
  const env = envLinks();
  const id = crypto.randomUUID();
  const token = tokenDoLink("autor", id, env.versaoAtual, env);
  const { error } = await clienteAdmin().rpc("servico_trocar_link_autor", {
    p_livro: c.livro.id,
    p_usuario: c.usuario.id,
    p_id: id,
    p_token_hash: hashDoToken(token),
    p_chave_versao: env.versaoAtual,
  });
  if (error) return falhou(error);
  return { ok: true, dados: { url: urlAutor(token) } };
}

/** Devolve o link ativo do autor; se ainda não existe, cria. */
export async function pegarLinkDoAutor(
  livroId: string,
): Promise<Resposta<{ url: string }>> {
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const { data } = await c.supabase
    .from("author_access")
    .select("id, chave_versao")
    .eq("book_id", c.livro.id)
    .is("revogado_em", null)
    .maybeSingle();
  if (data)
    return {
      ok: true,
      dados: {
        url: urlAutor(tokenDoLink("autor", data.id, data.chave_versao)),
      },
    };
  const r = await novoLinkDoAutor(c);
  if (r.ok) evento(c, "gerou_link_autor");
  return r;
}

/** Troca o link do autor: o antigo para de funcionar na hora. */
export async function trocarLinkDoAutor(
  livroId: string,
): Promise<Resposta<{ url: string }>> {
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const r = await novoLinkDoAutor(c);
  if (r.ok) evento(c, "trocou_link_autor");
  atualizar(livroId);
  return r;
}

// ── Áudios recebidos (prompt 5A) ─────────────────────────────────────────
// A linha nasce "enviando" com a sessão (a RLS confere membro e plano); o servidor assina o
// upload só daquele caminho; ao fim, confere o objeto no Storage e confirma com a chave
// secreta (servico_confirmar_audio), que também passa a pergunta ligada para respondida.

const esquemaAudios = z
  .array(
    z.object({
      nome: z.string().min(1).max(200),
      tamanho: z.number().int().min(1).max(MAX_AUDIO_BYTES),
      duracaoS: z.number().min(0).max(21600).nullable(),
      promptId: z.uuid().nullable(),
      titulo: z.string().trim().max(120).nullable(),
    }),
  )
  .min(1)
  .max(MAX_ARQUIVOS_LOTE);

async function assinarUpload(
  id: string,
  caminho: string,
  contentType: string,
): Promise<AudioPreparado | null> {
  const { data, error } = await clienteAdmin()
    .storage.from("audios")
    .createSignedUploadUrl(caminho, { upsert: true });
  if (error || !data) return null;
  return { id, caminho, token: data.token, contentType };
}

const esquemaOpcoesAudios = z
  .object({ conversa: z.object({ loteId: z.uuid() }).optional() })
  .optional();

/**
 * Sem opções: 1 arquivo é "upload"; 2 ou mais são um "lote" com o mesmo lote_id (prompt 7).
 * Com `conversa`: exatamente 1 arquivo, uma parte da conversa gravada aqui (P39).
 */
export async function prepararAudios(
  livroId: string,
  arquivos: AudioParaSubir[],
  opcoes?: OpcoesAudios,
): Promise<Resposta<AudioPreparado[]>> {
  const v = esquemaAudios.safeParse(arquivos);
  const o = esquemaOpcoesAudios.safeParse(opcoes);
  if (!o.success || (o.data?.conversa && arquivos.length !== 1))
    return { ok: false, mensagem: "Não deu certo agora. Tente de novo." };
  if (!v.success)
    return {
      ok: false,
      mensagem: `Escolha até ${MAX_ARQUIVOS_LOTE} áudios de até ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB cada.`,
    };
  const formatos = v.data.map((a) => formatoDoArquivo(a.nome));
  if (formatos.some((f) => !f))
    return {
      ok: false,
      mensagem: "Use .opus, .m4a, .mp3, .ogg, .wav ou .webm.",
    };
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;

  const perguntas = [
    ...new Set(v.data.flatMap((a) => (a.promptId ? [a.promptId] : []))),
  ];
  if (perguntas.length) {
    const { data } = await c.supabase
      .from("prompts")
      .select("id")
      .eq("book_id", c.livro.id)
      .in("id", perguntas)
      // A parte 2 de uma conversa chega depois que a parte 1 já marcou a pergunta.
      .in(
        "estado",
        o.data?.conversa
          ? ["para_enviar", "enviada", "respondida"]
          : ["para_enviar", "enviada"],
      );
    if ((data ?? []).length !== perguntas.length)
      return {
        ok: false,
        mensagem: "Uma das perguntas não está mais na lista. Escolha de novo.",
      };
  }

  const conversa = o.data?.conversa;
  const lote =
    conversa?.loteId ?? (v.data.length > 1 ? crypto.randomUUID() : null);
  const origem: OrigemAudio = conversa ? "conversa" : lote ? "lote" : "upload";
  const linhas = v.data.map((a, i) => {
    const f = formatos[i]!;
    const id = crypto.randomUUID();
    return {
      id,
      book_id: c.livro.id,
      origem,
      lote_id: lote,
      prompt_id: a.promptId,
      titulo: a.titulo || null,
      nome_arquivo: a.nome,
      caminho: caminhoAudio(c.livro.id, id, f.ext),
      content_type: f.contentType,
      tamanho_bytes: a.tamanho,
      duracao_s: a.duracaoS ? Math.max(1, Math.round(a.duracaoS)) : null,
    };
  });
  // Sem .select(): a RLS só mostra áudio já recebido.
  const { error } = await c.supabase.from("recordings").insert(linhas);
  if (error) return falhou(error);

  const preparados: AudioPreparado[] = [];
  for (const l of linhas) {
    const p = await assinarUpload(l.id, l.caminho, l.content_type);
    if (!p) return falhou(null);
    preparados.push(p);
  }
  return { ok: true, dados: preparados };
}

/** A linha "enviando" do livro (invisível para a sessão: lida com a chave secreta). */
async function audioEnviando(c: Contexto, id: string) {
  if (!uuid.safeParse(id).success) return null;
  const { data } = await clienteAdmin()
    .from("recordings")
    .select(
      "id, caminho, content_type, tamanho_bytes, prompt_id, upload, origem, lote_id, duracao_s, processado_em",
    )
    .eq("id", id)
    .eq("book_id", c.livro.id)
    .maybeSingle();
  if (!data || !audioDoLivro(data.caminho, c.livro.id, data.id)) return null;
  return data;
}

/** Token novo para tentar de novo um upload que parou (o token vale 2 h). */
export async function reassinarAudio(
  livroId: string,
  id: string,
): Promise<Resposta<AudioPreparado>> {
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const a = await audioEnviando(c, id);
  if (!a || a.upload !== "enviando")
    return { ok: false, mensagem: "Não deu certo agora. Tente de novo." };
  const p = await assinarUpload(a.id, a.caminho, a.content_type);
  return p ? { ok: true, dados: p } : falhou(null);
}

export async function confirmarAudio(
  livroId: string,
  id: string,
): Promise<Resposta> {
  const c = await paraEscrever(livroId);
  if (ehErro(c)) return c;
  const a = await audioEnviando(c, id);
  if (!a) return { ok: false, mensagem: "Não deu certo agora. Tente de novo." };
  if (a.upload === "recebido") {
    after(() => dispararSeRecebida(a));
    return { ok: true };
  }

  const admin = clienteAdmin();
  const { data: info, error: erroInfo } = await admin.storage
    .from("audios")
    .info(a.caminho);
  if (erroInfo || !info || Number(info.size) !== a.tamanho_bytes)
    return {
      ok: false,
      mensagem: "O áudio não chegou inteiro. Tente de novo.",
    };
  const { data: ok, error } = await admin.rpc("servico_confirmar_audio", {
    p_id: a.id,
    p_tamanho_bytes: a.tamanho_bytes,
  });
  if (error || !ok) return falhou(error);
  if (a.origem === "conversa")
    evento(c, "gravou", {
      recording: a.id,
      origem: a.origem,
      com_pergunta: Boolean(a.prompt_id),
    });
  else
    evento(c, "subiu_audio", {
      recording: a.id,
      com_pergunta: Boolean(a.prompt_id),
    });
  after(() => dispararSeRecebida(a));
  atualizar(livroId);
  return { ok: true };
}
