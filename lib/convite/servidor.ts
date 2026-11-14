import "server-only";
import { hashDoToken } from "@/lib/links";
import { tokenValido } from "@/lib/links-formato";
import { clienteAdmin } from "@/lib/supabase/admin";
import { mascararEmail, nomeSeguro, primeiroNome } from "./textos";

export type ConviteLido =
  | { estado: "invalido" }
  | {
      estado: "pendente";
      conviteId: string;
      autor: string;
      quem: string | null;
      emailConvidado: string; // completo: só o servidor compara
      emailMascarado: string;
    };

/** O que /convite/{token} mostra. Aceito, cancelado, vencido e inexistente são iguais. */
export async function lerConvite(token: string): Promise<ConviteLido> {
  if (!tokenValido.safeParse(token).success) return { estado: "invalido" };
  const db = clienteAdmin();
  const { data } = await db.rpc("servico_ler_convite", {
    p_token_hash: hashDoToken(token),
  });
  const c = data?.[0];
  if (!c || c.estado !== "pendente") return { estado: "invalido" };
  let quem: string | null = null;
  if (c.criado_por) {
    const { data: u } = await db.auth.admin.getUserById(c.criado_por);
    const meta = u.user?.user_metadata as Record<string, unknown> | undefined;
    quem = primeiroNome(String(meta?.full_name ?? meta?.name ?? "") || null);
  }
  return {
    estado: "pendente",
    conviteId: c.convite_id,
    autor: nomeSeguro(c.autor) || "alguém da família",
    quem,
    emailConvidado: c.email,
    emailMascarado: mascararEmail(c.email),
  };
}
