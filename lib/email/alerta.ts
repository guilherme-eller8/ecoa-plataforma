import "server-only";
// Aviso por e-mail a quem é admin quando uma história falha. Sem variável nova: os admins são
// os usuários com `app_metadata.role = admin` (a mesma regra do proxy.ts). Nunca lança.
import { urlDoApp } from "@/lib/env-servidor";
import { clienteAdmin } from "@/lib/supabase/admin";
import { enviarEmail } from "./enviar";
import { emailFalha } from "./modelos";

/** Chave do Resend: no máximo 1 aviso por livro, admin e hora (uma divisão de 30 não vira 30). */
export function chaveDoAviso(livro: string, admin: string, agora: Date) {
  return `falha:${livro}:${agora.toISOString().slice(0, 13)}:${admin}`;
}

export async function avisarAdminsDaFalha(
  f: { livro: string; etapa: string; codigo: string },
  agora = new Date(),
): Promise<number> {
  const { data, error } = await clienteAdmin().auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) {
    console.error("[alerta] admins", { codigo: error.code });
    return 0;
  }
  const admins = data.users.filter(
    (u) => u.app_metadata?.role === "admin" && u.email,
  );
  const email = emailFalha({ ...f, urlAdmin: `${urlDoApp()}/admin` });
  let enviados = 0;
  for (const u of admins) {
    const r = await enviarEmail(u.email!, email, {
      idempotencyKey: chaveDoAviso(f.livro, u.id, agora),
    });
    if (r.ok) enviados++;
  }
  return enviados;
}
