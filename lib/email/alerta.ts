import "server-only";
// Aviso por e-mail a quem é admin quando uma história falha. Sem variável nova: os admins são
// os usuários com `app_metadata.role = admin` (a mesma regra do proxy.ts). Nunca lança.
import { urlDoApp } from "@/lib/env-servidor";
import { clienteAdmin } from "@/lib/supabase/admin";
import { enviarEmail } from "./enviar";
import { emailAlerta, emailFalha } from "./modelos";

/** Usuários por página do Auth (o máximo que a API aceita). */
const POR_PAGINA = 1000;
/** Teto de páginas: 50 mil usuários. Passou disso, a lista de admins vira consulta no banco. */
const MAX_PAGINAS = 50;

/** Chave do Resend: no máximo 1 aviso por livro, admin e hora (uma divisão de 30 não vira 30). */
export function chaveDoAviso(livro: string, admin: string, agora: Date) {
  return `falha:${livro}:${agora.toISOString().slice(0, 13)}:${admin}`;
}

type Usuario = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
};
type Pagina = { users: Usuario[] | null; erro: string | null };

/**
 * Usuários com `app_metadata.role = admin` e e-mail, lendo todas as páginas do Auth (T56: só a
 * 1ª página de 200 fazia os admins sumirem quando a base passasse disso). Se o Auth falhar no
 * meio, devolve os achados até ali (nunca lança).
 */
export async function adminsParaAvisar(
  pagina: (n: number, porPagina: number) => Promise<Pagina> = paginaDoAuth,
): Promise<{ id: string; email: string }[]> {
  const admins: { id: string; email: string }[] = [];
  for (let n = 1; n <= MAX_PAGINAS; n++) {
    const { users, erro } = await pagina(n, POR_PAGINA);
    if (erro) {
      console.error("[alerta] admins", { codigo: erro, pagina: n });
      break;
    }
    for (const u of users ?? [])
      if (u.app_metadata?.role === "admin" && u.email)
        admins.push({ id: u.id, email: u.email });
    if ((users ?? []).length < POR_PAGINA) break;
  }
  return admins;
}

async function paginaDoAuth(n: number, porPagina: number): Promise<Pagina> {
  const { data, error } = await clienteAdmin().auth.admin.listUsers({
    page: n,
    perPage: porPagina,
  });
  return error
    ? { users: null, erro: error.code ?? "auth" }
    : { users: data.users, erro: null };
}

/**
 * T56: todo job que esgota as tentativas avisa por e-mail (PDF, QR, resumo, varredura, os
 * próprios alertas…). No máximo 1 aviso por função e hora. Só ids curtos (T36).
 */
export async function avisarAdminsDoJob(
  j: { funcao: string; runId: string; livro: string | null },
  agora = new Date(),
): Promise<number> {
  const admins = await adminsParaAvisar();
  const funcao = j.funcao.replace(/^ecoa-plataforma-/, "").slice(0, 60);
  const email = emailAlerta({
    titulo: `Job falhou: ${funcao}`,
    linhas: [
      `Função: ${funcao}. Run: ${j.runId.slice(-12)}.`,
      j.livro ? `Livro ${j.livro.slice(0, 8)}.` : "Sem livro.",
      "Chega no máximo 1 aviso por função a cada hora; a lista completa fica em Erros, no admin.",
    ],
    urlAdmin: `${urlDoApp()}/admin/erros`,
  });
  let enviados = 0;
  for (const u of admins) {
    const r = await enviarEmail(u.email, email, {
      idempotencyKey: `job:${funcao}:${agora.toISOString().slice(0, 13)}:${u.id}`,
    });
    if (r.ok) enviados++;
  }
  return enviados;
}

export async function avisarAdminsDaFalha(
  f: { livro: string; etapa: string; codigo: string },
  agora = new Date(),
): Promise<number> {
  const admins = await adminsParaAvisar();
  const email = emailFalha({ ...f, urlAdmin: `${urlDoApp()}/admin` });
  let enviados = 0;
  for (const u of admins) {
    const r = await enviarEmail(u.email, email, {
      idempotencyKey: chaveDoAviso(f.livro, u.id, agora),
    });
    if (r.ok) enviados++;
  }
  return enviados;
}
