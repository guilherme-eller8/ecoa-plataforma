"use server";

// Quem ajuda (prompt 11, design 4.1 e 4.2). O banco é quem garante cada regra; aqui só se
// evita trabalho à toa e se monta o e-mail.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { contaParaEmail } from "@/lib/acesso";
import { CONVITE_VALIDADE_DIAS } from "@/lib/config";
import { nomeSeguro, primeiroNome } from "@/lib/convite/textos";
import { emailConvite } from "@/lib/email/modelos";
import { enviarEmail } from "@/lib/email/enviar";
import { envLinks } from "@/lib/env-links";
import { fraseDoErro } from "@/lib/erros-banco";
import { registrarEvento } from "@/lib/eventos";
import { hashDoToken, tokenDoLink, urlConvite } from "@/lib/links";
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
const email = z
  .email()
  .max(254)
  .transform((e) => e.trim().toLowerCase());
const uuid = z.uuid();

function atualizar(livroId: string) {
  revalidatePath(`/livro/${livroId}`, "layout");
}

export async function convidar(
  livroId: string,
  entrada: string,
): Promise<Resposta<{ convite: ConviteDaTela | null }>> {
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  if (acesso.livro.papel !== "responsavel") return SO_RESPONSAVEL;
  const valido = email.safeParse(String(entrada ?? "").trim());
  if (!valido.success) return { ok: false, mensagem: "Confira o e-mail." };
  const destino = valido.data;
  const { usuario, livro } = acesso;
  const db = clienteAdmin();

  // 1. As regras do banco, sem efeito: nada é criado se o convite não vai sair.
  const pre = await db.rpc("servico_pode_convidar", {
    p_livro: livro.id,
    p_usuario: usuario.id,
    p_email: destino,
  });
  if (pre.error) return { ok: false, mensagem: fraseDoErro(pre.error) };

  // 2. A conta do convidado (o cadastro é fechado). Conta recusada: resposta igual à de
  // sucesso, sem gravar nem enviar nada (não vira oráculo de contas).
  const conta = await contaParaEmail(destino, db);
  if (conta.tipo === "erro")
    return { ok: false, mensagem: "Não deu para enviar. Tente de novo." };
  if (conta.tipo === "recusada") {
    console.warn("[convite] conta recusada pela identidade", {
      livro: livro.id,
    });
    return { ok: true, dados: { convite: null } };
  }

  // 3. O convite, com o livro travado no banco.
  const env = envLinks();
  const id = crypto.randomUUID();
  const token = tokenDoLink("convite", id, env.versaoAtual, env);
  const criado = await db.rpc("servico_criar_convite", {
    p_livro: livro.id,
    p_usuario: usuario.id,
    p_id: id,
    p_email: destino,
    p_token_hash: hashDoToken(token),
    p_chave_versao: env.versaoAtual,
  });
  if (criado.error) {
    if (conta.tipo === "criada") await db.auth.admin.deleteUser(conta.id);
    return { ok: false, mensagem: fraseDoErro(criado.error) };
  }

  // 4. O e-mail. Assunto fixo e nomes saneados.
  const { data: eu } = await db.auth.admin.getUserById(usuario.id);
  const meta = eu.user?.user_metadata as Record<string, unknown> | undefined;
  const autor = nomeDoAutor(livro);
  await enviarEmail(
    destino,
    emailConvite({
      quem:
        primeiroNome(
          String(meta?.full_name ?? meta?.name ?? "") || null,
        ) ?? "",
      apelido: nomeSeguro(autor),
      urlConvite: urlConvite(token),
    }),
    { idempotencyKey: `convite-${id}` },
  );
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
          email: destino,
          expira_em: new Date(
            Date.now() + CONVITE_VALIDADE_DIAS * 86_400_000,
          ).toISOString(),
          chave_versao: env.versaoAtual,
        },
        autor,
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
  if (!data) return { ok: false, mensagem: "Quem cuida do livro não sai dele." };
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
