import "server-only";
import type { User } from "@supabase/supabase-js";
import { emailAcesso } from "@/lib/email/modelos";
import { enviarEmail } from "@/lib/email/enviar";
import { urlDoApp } from "@/lib/env-servidor";
import { clienteAdmin, type ClienteAdmin } from "@/lib/supabase/admin";

const PROVEDORES_ACEITOS = new Set(["email", "google"]);

/**
 * Uma conta já existente só vira responsável se entrou apenas por e-mail ou Google.
 * A proteção principal é o cadastro público desligado no Supabase (ver guia de setup).
 */
export function identidadeAceitavel(
  usuario: Pick<User, "identities" | "app_metadata">,
): boolean {
  const provedores = [
    ...(usuario.identities ?? []).map((i) => i.provider),
    ...((usuario.app_metadata?.providers as string[] | undefined) ?? []),
  ];
  return provedores.every((p) => PROVEDORES_ACEITOS.has(p));
}

/** Manda (ou reenvia) o e-mail de acesso ao responsável do livro. */
export async function enviarAcesso(
  livroId: string,
  cliente: ClienteAdmin = clienteAdmin(),
) {
  const [{ data: membro }, { data: livro }] = await Promise.all([
    cliente
      .from("book_members")
      .select("user_id")
      .eq("book_id", livroId)
      .eq("papel", "responsavel")
      .maybeSingle(),
    cliente.from("books").select("autor_nome").eq("id", livroId).maybeSingle(),
  ]);
  if (!membro || !livro) return { ok: false };

  const { data, error } = await cliente.auth.admin.getUserById(membro.user_id);
  if (error || !data.user.email) return { ok: false };

  return enviarEmail(
    data.user.email,
    emailAcesso({
      autorNome: livro.autor_nome,
      urlEntrar: `${urlDoApp()}/entrar`,
    }),
  );
}
