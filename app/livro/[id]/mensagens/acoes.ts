"use server";

// Ações da aba Mensagens (P65). Curadoria pelo cliente da sessão (RLS e as funções mensagem_*
// conferem membro, livro e plano). O link e a exclusão de arquivos usam a chave secreta só
// depois do banco autorizar. Eventos só com ids e booleanos.

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { arquivoDaMensagem } from "@/lib/arquivos";
import { MAX_MENSAGEM_CARACTERES } from "@/lib/config";
import { envLinks } from "@/lib/env-links";
import { fraseDoErro } from "@/lib/erros-banco";
import type { Acao } from "@/lib/eventos-acoes";
import { registrarEvento } from "@/lib/eventos";
import { hashDoToken, tokenDoLink, urlMensagem } from "@/lib/links";
import { livroDaAcao, type LivroComAcesso } from "@/lib/livro/acesso";
import type { Resposta } from "@/lib/livro/tipos";
import { linkDeMensagens } from "@/lib/mensagens/dados";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";

const SEM_ACESSO = {
  ok: false as const,
  mensagem: "Você não tem acesso a este livro.",
};
const FECHADO = {
  ok: false as const,
  mensagem: "Este livro não aceita mudanças agora.",
};
const uuid = z.uuid();

function evento(
  a: LivroComAcesso,
  acao: Acao,
  detalhes?: Record<string, string | boolean>,
) {
  after(() =>
    registrarEvento({
      quem: a.usuario.id,
      papel: a.livro.papel,
      acao,
      livro: a.livro.id,
      detalhes,
    }),
  );
}

const atualizar = (livro: string) => {
  revalidatePath(`/livro/${livro}/mensagens`);
  revalidatePath(`/livro/${livro}`);
};

async function novoLink(a: LivroComAcesso): Promise<Resposta<{ url: string }>> {
  const env = envLinks();
  const id = crypto.randomUUID();
  const token = tokenDoLink("mensagem", id, env.versaoAtual, env);
  // p_usuario vem da sessão (livroDaAcao), nunca do formulário.
  const { error } = await clienteAdmin().rpc("servico_trocar_link_mensagem", {
    p_livro: a.livro.id,
    p_usuario: a.usuario.id,
    p_id: id,
    p_token_hash: hashDoToken(token),
    p_chave_versao: env.versaoAtual,
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  return { ok: true, dados: { url: urlMensagem(token) } };
}

/** O link ativo; na primeira vez, cria (qualquer membro, P60). */
export async function pegarLink(
  livroId: string,
): Promise<Resposta<{ url: string }>> {
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  const atual = await linkDeMensagens(a.livro.id);
  if (atual) return { ok: true, dados: { url: atual } };
  if (!a.podeEscrever) return FECHADO;
  const r = await novoLink(a);
  if (r.ok) evento(a, "gerou_link_mensagem");
  atualizar(livroId);
  return r;
}

/** Troca o link ativo: só o responsável (o banco confere, P60). Rascunhos no meio caem. */
export async function trocarLink(
  livroId: string,
): Promise<Resposta<{ url: string }>> {
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  if (!a.podeEscrever) return FECHADO;
  const r = await novoLink(a);
  if (r.ok) evento(a, "trocou_link_mensagem");
  atualizar(livroId);
  return r;
}

async function chamar(
  livroId: string,
  mensagem: string,
  acao: Acao,
  rpc: (s: Awaited<ReturnType<typeof clienteSessao>>) => PromiseLike<{
    error: { message: string } | null;
  }>,
  detalhes?: Record<string, boolean>,
): Promise<Resposta> {
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  if (!uuid.safeParse(mensagem).success)
    return { ok: false, mensagem: "Mensagem inválida." };
  const { error } = await rpc(await clienteSessao());
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  evento(a, acao, { mensagem, ...detalhes });
  atualizar(livroId);
  return { ok: true };
}

export async function editar(
  livroId: string,
  mensagem: string,
  texto: string,
): Promise<Resposta> {
  const t = z
    .string()
    .trim()
    .min(1)
    .max(MAX_MENSAGEM_CARACTERES)
    .safeParse(texto);
  if (!t.success)
    return {
      ok: false,
      mensagem: texto.trim()
        ? "O texto ficou longo demais."
        : "Escreva a mensagem antes.",
    };
  return chamar(livroId, mensagem, "mensagem_editada", (s) =>
    s.rpc("mensagem_editar", { p_id: mensagem, p_texto: t.data }),
  );
}

export async function noLivro(
  livroId: string,
  mensagem: string,
  incluir: boolean,
): Promise<Resposta> {
  return chamar(
    livroId,
    mensagem,
    "mensagem_no_livro",
    (s) =>
      s.rpc("mensagem_no_livro", {
        p_id: mensagem,
        p_incluir: incluir === true,
      }),
    { incluir: incluir === true },
  );
}

export async function arquivar(
  livroId: string,
  mensagem: string,
  arquivarSim: boolean,
): Promise<Resposta> {
  return chamar(
    livroId,
    mensagem,
    "mensagem_arquivada",
    (s) =>
      s.rpc("mensagem_arquivar", {
        p_id: mensagem,
        p_arquivar: arquivarSim === true,
      }),
    { arquivar: arquivarSim === true },
  );
}

/** Apagar de vez (só o responsável, só arquivada; o banco confere). Depois, os arquivos. */
export async function apagar(
  livroId: string,
  mensagem: string,
): Promise<Resposta> {
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  if (!uuid.safeParse(mensagem).success)
    return { ok: false, mensagem: "Mensagem inválida." };
  const { data, error } = await (
    await clienteSessao()
  ).rpc("mensagem_apagar", { p_id: mensagem });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  const caminhos = (data ?? [])
    .flatMap((r) => [
      r.audio_caminho && { c: r.audio_caminho, t: "audio" as const },
      r.foto_caminho && { c: r.foto_caminho, t: "foto" as const },
    ])
    .filter((x): x is { c: string; t: "audio" | "foto" } => Boolean(x))
    .filter((x) => arquivoDaMensagem(x.c, a.livro.id, mensagem, x.t))
    .map((x) => x.c);
  if (caminhos.length)
    await clienteAdmin().storage.from("mensagens").remove(caminhos);
  evento(a, "mensagem_apagada", { mensagem });
  atualizar(livroId);
  return { ok: true };
}
