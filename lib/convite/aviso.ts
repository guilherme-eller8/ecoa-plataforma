import "server-only";
// Convite pelo nome (P81; design 4.2 e 4.4): aviso ao responsável e limpeza de conta sobrando.
import { emailConviteDefinido } from "@/lib/email/modelos";
import { enviarEmail } from "@/lib/email/enviar";
import { urlDoApp } from "@/lib/env-servidor";
import { registrarEvento } from "@/lib/eventos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { nomeSeguro } from "./textos";

async function falhou(onde: string) {
  await registrarEvento({
    quem: null,
    papel: "sistema",
    acao: "erro_servidor",
    livro: null,
    detalhes: { rota: "/convite", origem: onde },
  }).catch(() => {
    // Registrar o erro nunca pode causar outro.
  });
}

/**
 * Avisa quem convidou que o e-mail do convite foi definido (ou trocado), antes do acesso.
 * Falha no envio não desfaz nada: grava `erro_servidor` (T53).
 */
export async function avisarResponsavel(conviteId: string): Promise<void> {
  try {
    const db = clienteAdmin();
    const { data: c } = await db
      .from("book_invites")
      .select("id, book_id, nome, email, email_trocas, criado_por")
      .eq("id", conviteId)
      .maybeSingle();
    if (!c?.email || !c.criado_por) return;
    const [{ data: u }, { data: livro }] = await Promise.all([
      db.auth.admin.getUserById(c.criado_por),
      db
        .from("books")
        .select("autor_nome, autor_apelido")
        .eq("id", c.book_id)
        .maybeSingle(),
    ]);
    const para = u.user?.email;
    if (!para) return;
    const r = await enviarEmail(
      para,
      emailConviteDefinido({
        nome: nomeSeguro(c.nome),
        apelido: nomeSeguro(
          livro?.autor_apelido?.trim() || livro?.autor_nome || "",
        ),
        email: c.email,
        urlPessoas: `${urlDoApp()}/livro/${c.book_id}/pessoas`,
      }),
      { idempotencyKey: `convite-email-${c.id}-${c.email_trocas}` },
    );
    if (!r.ok) await falhou("aviso_responsavel");
  } catch {
    await falhou("aviso_responsavel");
  }
}

/**
 * Apaga a conta de um e-mail que ficou sem uso (melhor esforço): nunca entrou, não está em
 * livro nenhum e nenhum convite aponta para ele. Serve ao e-mail corrigido e à conta criada
 * para uma definição que falhou.
 */
export async function apagarContaSemUso(email: string): Promise<void> {
  try {
    const db = clienteAdmin();
    const { data: id } = await db.rpc("admin_usuario_por_email", {
      p_email: email,
    });
    if (!id) return;
    const [{ data: u }, membros, convites] = await Promise.all([
      db.auth.admin.getUserById(id),
      db
        .from("book_members")
        .select("book_id", { count: "exact", head: true })
        .eq("user_id", id),
      db
        .from("book_invites")
        .select("id", { count: "exact", head: true })
        .eq("email", email),
    ]);
    if (!u.user || u.user.last_sign_in_at) return;
    if (membros.error || convites.error) return;
    if ((membros.count ?? 1) > 0 || (convites.count ?? 1) > 0) return;
    await db.auth.admin.deleteUser(id);
  } catch {
    await falhou("apagar_conta");
  }
}
