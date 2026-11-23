"use server";

// Convite de co-facilitador. P59: aceitar da home, pela conta com o e-mail convidado.
// P81 (convite pelo nome): o convidado define o próprio e-mail no link, sem sessão, e aceita
// com sessão em 1 toque. Design: docs/designs/convite-pelo-nome.md, 4.2.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { contaParaEmail } from "@/lib/acesso";
import { apagarContaSemUso, avisarResponsavel } from "@/lib/convite/aviso";
import {
  donoDesteAparelho,
  expiraDoConvite,
  lerConvite,
  novoDono,
} from "@/lib/convite/servidor";
import { mascararEmail } from "@/lib/convite/textos";
import { enviarLinkDeEntrada } from "@/lib/entrar/link";
import { fraseDoErro } from "@/lib/erros-banco";
import { hashDoToken } from "@/lib/links";
import type { Resposta } from "@/lib/livro/tipos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";

const INVALIDO = {
  ok: false as const,
  mensagem: fraseDoErro({ message: "convite_invalido" }),
};
const DE_NOVO = {
  ok: false as const,
  mensagem: "Não deu certo. Tente de novo.",
};
const email = z
  .email()
  .max(254)
  .transform((e) => e.trim().toLowerCase());

/** Aceitar da home não usa o token: o banco confere o e-mail confirmado de quem está logado. */
export async function aceitarConvite(convite: string): Promise<Resposta> {
  if (!z.uuid().safeParse(convite).success)
    return { ok: false, mensagem: "Convite não encontrado." };
  const db = await clienteSessao();
  const { data, error } = await db.rpc("aceitar_convite", {
    p_convite: convite,
  });
  if (error || !data) return { ok: false, mensagem: fraseDoErro(error) };
  revalidatePath("/", "layout");
  redirect(`/livro/${data}/bemvindo`);
}

/**
 * Sem sessão: o convidado digita o próprio e-mail. Quem define primeiro fica com o convite;
 * depois, só o aparelho dono corrige (cookie com hash no banco). 'definir', 'mesmo' e 'ignorar'
 * (já está no livro, ou conta recusada) respondem igual: não vira oráculo de contas.
 */
export async function definirEmailDoConvite(
  token: string,
  entrada: string,
): Promise<Resposta<{ emailMascarado: string }>> {
  const valido = email.safeParse(String(entrada ?? "").trim());
  if (!valido.success) return { ok: false, mensagem: "Confira o e-mail." };
  const destino = valido.data;
  const lido = await lerConvite(token);
  if (lido.estado !== "pendente" || !lido.nome) return INVALIDO;
  const hash = hashDoToken(token);
  const db = clienteAdmin();
  const dono = await donoDesteAparelho(lido.conviteId);
  const pronto = {
    ok: true as const,
    dados: { emailMascarado: mascararEmail(destino) },
  };

  // 1. As regras do banco, sem efeito: nenhuma conta nasce se o e-mail não vai ser gravado.
  const pre = await db.rpc("servico_pode_definir_email", {
    p_token_hash: hash,
    p_email: destino,
    p_dono_hash: dono,
  });
  if (pre.error) return { ok: false, mensagem: fraseDoErro(pre.error) };
  if (pre.data !== "definir") return pronto;

  // 2. A conta (o cadastro público é fechado). Recusada: igual a 'ignorar'.
  const conta = await contaParaEmail(destino, db);
  if (conta.tipo === "erro") return DE_NOVO;
  if (conta.tipo === "recusada") return pronto;

  // 3. Grava, com o livro e o convite travados. Na primeira vez, este aparelho vira o dono.
  const novo = dono
    ? null
    : await novoDono(lido.conviteId, await expiraDoConvite(lido.conviteId));
  const gravado = await db.rpc("servico_definir_email_convite", {
    p_token_hash: hash,
    p_email: destino,
    p_dono_hash: dono ?? novo!.hash,
  });
  if (gravado.error || gravado.data !== "definir") {
    if (conta.tipo === "criada") after(() => apagarContaSemUso(destino));
    if (gravado.error)
      return { ok: false, mensagem: fraseDoErro(gravado.error) };
    return pronto;
  }
  if (novo) await novo.gravar();
  const anterior = lido.email;
  after(async () => {
    await avisarResponsavel(lido.conviteId);
    if (anterior && anterior !== destino) await apagarContaSemUso(anterior);
  });
  return pronto;
}

/** *Receber link por e-mail*: o e-mail vem do convite, lido no servidor pelo token. */
export async function receberLinkDoConvite(token: string): Promise<Resposta> {
  const lido = await lerConvite(token);
  if (lido.estado === "pendente" && lido.nome && lido.email)
    await enviarLinkDeEntrada(lido.email);
  return { ok: true };
}

/**
 * Com sessão: define (se preciso) e aceita na mesma transação. O e-mail vem da sessão, no
 * banco; o cookie de dono deixa trocar um e-mail digitado errado.
 */
export async function aceitarPeloLink(token: string): Promise<Resposta> {
  const lido = await lerConvite(token);
  if (lido.estado !== "pendente") return INVALIDO;
  const db = await clienteSessao();
  const { data, error } = await db.rpc("definir_e_aceitar_convite", {
    p_token_hash: hashDoToken(token),
    p_dono_hash: await donoDesteAparelho(lido.conviteId),
  });
  const r = data?.[0];
  if (error || !r) return { ok: false, mensagem: fraseDoErro(error) };
  if (r.definiu) {
    const {
      data: { user },
    } = await db.auth.getUser();
    const anterior = lido.email;
    const agora = user?.email?.toLowerCase();
    after(async () => {
      await avisarResponsavel(lido.conviteId);
      if (anterior && anterior !== agora) await apagarContaSemUso(anterior);
    });
  }
  revalidatePath("/", "layout");
  redirect(`/livro/${r.livro_id}/bemvindo`);
}
