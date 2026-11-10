"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { enviarAcesso, identidadeAceitavel } from "@/lib/acesso";
import { DURACAO_PLANO_MESES } from "@/lib/config";
import { registrarEvento } from "@/lib/eventos";
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
