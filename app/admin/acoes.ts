"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { enviarAcesso, identidadeAceitavel } from "@/lib/acesso";
import { DURACAO_PLANO_MESES } from "@/lib/config";
import { registrarEvento } from "@/lib/eventos";
import { dispararEscrita, dispararGravacao } from "@/lib/pipeline/disparo";
import type { Resultado } from "@/lib/resultado";
import { usuarioAtual } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/admin";

const NEGADO: Resultado = {
  ok: false,
  mensagem: "Só o admin pode fazer isso.",
};

async function admin() {
  const usuario = await usuarioAtual();
  return usuario?.ehAdmin ? usuario : null;
}

const esquemaAtivar = z.object({
  email: z.email().transform((e) => e.trim().toLowerCase()),
  autor_nome: z.string().trim().max(120).optional(),
});

export async function ativarPlano(
  _anterior: Resultado | null,
  dados: FormData,
): Promise<Resultado> {
  const quem = await admin();
  if (!quem) return NEGADO;

  const entrada = esquemaAtivar.safeParse({
    email: String(dados.get("email") ?? "").trim(),
    autor_nome: String(dados.get("autor_nome") ?? ""),
  });
  if (!entrada.success) return { ok: false, mensagem: "Confira o e-mail." };
  const { email, autor_nome } = entrada.data;

  const db = clienteAdmin();
  const { data: existente, error: erroBusca } = await db.rpc(
    "admin_usuario_por_email",
    { p_email: email },
  );
  if (erroBusca)
    return {
      ok: false,
      mensagem: "Não deu para consultar o e-mail. Tente de novo.",
    };

  let responsavel = existente;
  if (responsavel) {
    const { data } = await db.auth.admin.getUserById(responsavel);
    if (!data.user || !identidadeAceitavel(data.user)) {
      return {
        ok: false,
        mensagem: "Esta conta não pode ser usada. Fale com o suporte.",
      };
    }
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (error || !data.user)
      return {
        ok: false,
        mensagem: "Não deu para criar a conta. Tente de novo.",
      };
    responsavel = data.user.id;
  }

  const { data: livroId, error } = await db.rpc("admin_ativar_plano", {
    p_responsavel: responsavel,
    p_autor_nome: autor_nome ?? "",
    p_meses: DURACAO_PLANO_MESES,
  });
  if (error || !livroId)
    return {
      ok: false,
      mensagem: "Não deu para ativar o plano. Tente de novo.",
    };

  await registrarEvento({
    quem: quem.id,
    papel: "admin",
    acao: "plano_ativado",
    livro: livroId,
  });
  const envio = await enviarAcesso(livroId, db);
  refresh();
  return envio.ok
    ? { ok: true, mensagem: `Plano ativado. O e-mail foi para ${email}.` }
    : {
        ok: false,
        mensagem: "Plano ativado, mas o e-mail não saiu. Use Reenviar acesso.",
      };
}

const esquemaLivro = z.object({ livro_id: z.uuid() });

export async function renovarPlano(
  _anterior: Resultado | null,
  dados: FormData,
): Promise<Resultado> {
  const quem = await admin();
  if (!quem) return NEGADO;
  const entrada = esquemaLivro.safeParse({ livro_id: dados.get("livro_id") });
  if (!entrada.success) return { ok: false, mensagem: "Livro não encontrado." };

  const { error } = await clienteAdmin().rpc("admin_renovar_plano", {
    p_livro: entrada.data.livro_id,
    p_meses: DURACAO_PLANO_MESES,
  });
  if (error)
    return { ok: false, mensagem: "Não deu para renovar. Tente de novo." };

  await registrarEvento({
    quem: quem.id,
    papel: "admin",
    acao: "plano_renovado",
    livro: entrada.data.livro_id,
  });
  refresh();
  return {
    ok: true,
    mensagem: `Renovado por mais ${DURACAO_PLANO_MESES} meses.`,
  };
}

export async function reenviarAcesso(
  _anterior: Resultado | null,
  dados: FormData,
): Promise<Resultado> {
  const quem = await admin();
  if (!quem) return NEGADO;
  const entrada = esquemaLivro.safeParse({ livro_id: dados.get("livro_id") });
  if (!entrada.success) return { ok: false, mensagem: "Livro não encontrado." };

  const envio = await enviarAcesso(entrada.data.livro_id);
  if (!envio.ok)
    return {
      ok: false,
      mensagem: "O e-mail não saiu. Tente de novo em instantes.",
    };
  await registrarEvento({
    quem: quem.id,
    papel: "admin",
    acao: "acesso_reenviado",
    livro: entrada.data.livro_id,
  });
  return { ok: true, mensagem: "E-mail de acesso reenviado." };
}

// ── Processamento (prompt 6) ─────────────────────────────────────────────

/** Tentar de novo: só sai de "falhou" (atômico no banco); só então reenvia o evento. */
export async function tentarDeNovo(historiaId: string): Promise<Resultado> {
  const quem = await admin();
  if (!quem) return NEGADO;
  if (!z.uuid().safeParse(historiaId).success)
    return { ok: false, mensagem: "História não encontrada." };
  const db = clienteAdmin();
  const { data: sr } = await db
    .from("story_recordings")
    .select("recording_id, book_id")
    .eq("story_id", historiaId)
    .order("ordem")
    .limit(1)
    .maybeSingle();
  if (!sr) return { ok: false, mensagem: "História não encontrada." };
  const { data: reaberta } = await db.rpc("servico_mudar_etapa", {
    p_story: historiaId,
    p_para: "ouvindo",
  });
  if (!reaberta)
    return { ok: false, mensagem: "Esta história não está mais com falha." };
  // Prompt 7: história que passou por uma divisão confirmada volta pela escrita; as outras,
  // pela gravação (o banco devolve "dividida" se mandássemos a gravação).
  const { data: h } = await db
    .from("stories")
    .select("divisao_de, divisao")
    .eq("id", historiaId)
    .maybeSingle();
  const dividida =
    Boolean(h?.divisao_de) ||
    Boolean((h?.divisao as { final?: unknown } | null)?.final);
  if (dividida) await dispararEscrita([historiaId], `admin:${Date.now()}`);
  else await dispararGravacao(sr.recording_id, `admin:${Date.now()}`);
  await registrarEvento({
    quem: quem.id,
    papel: "admin",
    acao: "processamento_refeito",
    livro: sr.book_id,
    detalhes: { story: historiaId },
  });
  refresh();
  return { ok: true, mensagem: "Processando de novo." };
}

/** Processar: gravação recebida que não virou história (o banco decide se pode). */
export async function processarAgora(gravacaoId: string): Promise<Resultado> {
  const quem = await admin();
  if (!quem) return NEGADO;
  if (!z.uuid().safeParse(gravacaoId).success)
    return { ok: false, mensagem: "Gravação não encontrada." };
  const { data: g } = await clienteAdmin()
    .from("recordings")
    .select("book_id")
    .eq("id", gravacaoId)
    .maybeSingle();
  if (!g) return { ok: false, mensagem: "Gravação não encontrada." };
  await dispararGravacao(gravacaoId, `admin:${Date.now()}`);
  await registrarEvento({
    quem: quem.id,
    papel: "admin",
    acao: "processamento_refeito",
    livro: g.book_id,
    detalhes: { recording: gravacaoId },
  });
  refresh();
  return { ok: true, mensagem: "Enviado para a fila." };
}
