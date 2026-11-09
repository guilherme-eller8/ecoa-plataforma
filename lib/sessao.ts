import "server-only";
import { notFound } from "next/navigation";
import type { PapelMembro, PasseEstado } from "@/lib/supabase/tipos";
import { clienteSessao } from "@/lib/supabase/servidor";

export type Usuario = { id: string; email: string | null; ehAdmin: boolean };

/** Quem está logado, a partir do token verificado. */
export async function usuarioAtual(): Promise<Usuario | null> {
  const supabase = await clienteSessao();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: claims.email ?? null,
    // app_metadata só a chave secreta edita; user_metadata não conta.
    ehAdmin: claims.app_metadata?.role === "admin",
  };
}

/** Para páginas e ações do admin: quem não é admin vê 404. */
export async function exigirAdmin(): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (!usuario?.ehAdmin) notFound();
  return usuario;
}

export type LivroDoMembro = {
  id: string;
  autor_nome: string | null;
  passe_estado: PasseEstado;
  passe_vence_em: string | null;
  papel: PapelMembro;
};

/** Livros de que a pessoa é membro, do mais recente ao mais antigo. Filtro explícito, não só a RLS. */
export async function livrosDoMembro(
  usuarioId: string,
): Promise<LivroDoMembro[]> {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("book_members")
    .select(
      "papel, books!inner(id, autor_nome, passe_estado, passe_vence_em, criado_em)",
    )
    .eq("user_id", usuarioId);
  return (data ?? [])
    .map((m) => ({ ...m.books, papel: m.papel }))
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    .map(({ id, autor_nome, passe_estado, passe_vence_em, papel }) => ({
      id,
      autor_nome,
      passe_estado,
      passe_vence_em,
      papel,
    }));
}
