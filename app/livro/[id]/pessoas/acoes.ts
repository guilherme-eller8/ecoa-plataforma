"use server";

// Quem ajuda (prompt 11, design 4.1 e 4.2; convite pelo nome, P81). O banco é quem garante
// cada regra; aqui só se valida a entrada e se monta a mensagem.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { CONVITE_VALIDADE_DIAS } from "@/lib/config";
import { nomeDoConvite } from "@/lib/convite/textos";
import { envLinks } from "@/lib/env-links";
import { fraseDoErro } from "@/lib/erros-banco";
import { registrarEvento } from "@/lib/eventos";
import { hashDoToken, tokenDoLink } from "@/lib/links";
import { livroDaAcao, nomeDoAutor } from "@/lib/livro/acesso";
import { conviteDaTela } from "@/lib/livro/pessoas";
import type { ConviteDaTela, Resposta } from "@/lib/livro/tipos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";
import { trocarLinkDaFamilia, trocarLinkDoAutor } from "../acoes";

const SEM_ACESSO = {
  ok: false as const,
  mensagem: "Você não tem acesso a este livro.",
};
const SO_RESPONSAVEL = {
  ok: false as const,
  mensagem: "Só quem cuida do livro pode fazer isso.",
};
const uuid = z.uuid();

function atualizar(livroId: string) {
  revalidatePath(`/livro/${livroId}`, "layout");
}

/**
 * Convite pelo nome (P81): nenhum e-mail sai da Ecoa. O convidado define o próprio e-mail no
 * link, e o responsável manda o link pelo WhatsApp (P9).
 */
export async function convidar(
  livroId: string,
  entrada: string,
): Promise<Resposta<{ convite: ConviteDaTela }>> {
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  if (acesso.livro.papel !== "responsavel") return SO_RESPONSAVEL;
  const nome = nomeDoConvite(String(entrada ?? ""));
  if (!nome) return { ok: false, mensagem: "Use só letras no nome." };
  const { usuario, livro } = acesso;

  const env = envLinks();
  const id = crypto.randomUUID();
  const token = tokenDoLink("convite", id, env.versaoAtual, env);
  const criado = await clienteAdmin().rpc("servico_criar_convite_nome", {
    p_livro: livro.id,
    p_usuario: usuario.id,
    p_id: id,
    p_nome: nome,
    p_token_hash: hashDoToken(token),
    p_chave_versao: env.versaoAtual,
  });
  if (criado.error) return { ok: false, mensagem: fraseDoErro(criado.error) };

  after(() =>
    registrarEvento({
      quem: usuario.id,
      papel: "responsavel",
      acao: "convidou",
      livro: livro.id,
      detalhes: { convite_id: id },
    }),
  );
  atualizar(livro.id);
  return {
    ok: true,
    dados: {
      convite: conviteDaTela(
        {
          id,
          nome,
          email: null,
          expira_em: new Date(
            Date.now() + CONVITE_VALIDADE_DIAS * 86_400_000,
          ).toISOString(),
          chave_versao: env.versaoAtual,
        },
        nomeDoAutor(livro),
      ),
    },
  };
}

export async function cancelarConvite(
  livroId: string,
  convite: string,
): Promise<Resposta> {
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  if (!uuid.safeParse(convite).success)
    return { ok: false, mensagem: "Convite não encontrado." };
  const db = await clienteSessao();
  const { error } = await db.rpc("cancelar_convite", { p_convite: convite });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  after(() =>
    registrarEvento({
      quem: acesso.usuario.id,
      papel: acesso.livro.papel,
      acao: "convite_cancelado",
      livro: livroId,
      detalhes: { convite_id: convite },
    }),
  );
  atualizar(livroId);
  return { ok: true };
}

/** O evento removeu_membro é gravado pelo banco. */
export async function remover(
  livroId: string,
  usuario: string,
): Promise<Resposta> {
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  if (!uuid.safeParse(usuario).success)
    return { ok: false, mensagem: "Pessoa não encontrada." };
  const db = await clienteSessao();
  const { error } = await db.rpc("remover_membro", {
    p_livro: livroId,
    p_usuario: usuario,
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  atualizar(livroId);
  return { ok: true };
}

/** Sair do livro (co-facilitador). O evento saiu_do_livro é gravado pelo banco. */
export async function sair(livroId: string): Promise<Resposta> {
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  const db = await clienteSessao();
  const { data, error } = await db.rpc("sair_do_livro", { p_livro: livroId });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  if (!data)
    return { ok: false, mensagem: "Quem cuida do livro não sai dele." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Depois de remover alguém: troca os links do autor e da família que existirem (só o responsável). */
export async function trocarLinks(livroId: string): Promise<Resposta> {
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  if (acesso.livro.papel !== "responsavel") return SO_RESPONSAVEL;
  const db = await clienteSessao();
  const [autor, familia] = await Promise.all([
    db
      .from("author_access")
      .select("id")
      .eq("book_id", livroId)
      .is("revogado_em", null)
      .maybeSingle(),
    db
      .from("family_access")
      .select("id")
      .eq("book_id", livroId)
      .is("revogado_em", null)
      .maybeSingle(),
  ]);
  if (autor.data) {
    const r = await trocarLinkDoAutor(livroId);
    if (!r.ok) return r;
  }
  if (familia.data) {
    const r = await trocarLinkDaFamilia(livroId);
    if (!r.ok) return r;
  }
  return { ok: true };
}
