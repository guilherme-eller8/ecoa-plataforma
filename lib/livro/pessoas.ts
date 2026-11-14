import "server-only";
import { tokenDoLink, urlConvite } from "@/lib/links";
import { clienteSessao } from "@/lib/supabase/servidor";
import { mensagemConvite } from "@/lib/whatsapp";
import type { ConviteDaTela, MembroDaTela } from "./tipos";

/** Mensagem do convite pendente para o WhatsApp: o token é derivado de novo pelo HMAC (T25). */
export function conviteDaTela(
  c: { id: string; email: string; expira_em: string; chave_versao: number },
  autor: string,
): ConviteDaTela {
  return {
    id: c.id,
    email: c.email,
    expiraEm: c.expira_em,
    mensagem: mensagemConvite({
      autor,
      link: urlConvite(tokenDoLink("convite", c.id, c.chave_versao)),
    }),
  };
}

/** Quem está no livro e, para o responsável, os convites pendentes (a RLS só deixa ele ler). */
export async function pessoasDoLivro(
  livroId: string,
  usuarioId: string,
  autor: string,
  ehResponsavel: boolean,
): Promise<{
  membros: MembroDaTela[];
  convites: ConviteDaTela[];
  temLinks: boolean;
}> {
  const db = await clienteSessao();
  const [membros, convites, autorLink, familiaLink] = await Promise.all([
    db.rpc("membros_do_livro", { p_livro: livroId }),
    ehResponsavel
      ? db
          .from("book_invites")
          .select("id, email, expira_em, chave_versao")
          .eq("book_id", livroId)
          .is("aceito_em", null)
          .is("revogado_em", null)
          .gt("expira_em", new Date().toISOString())
          .order("criado_em")
      : Promise.resolve({ data: [] }),
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
  return {
    membros: (membros.data ?? [])
      .filter((m) => m.papel === "responsavel" || m.papel === "cofacilitador")
      .map((m) => ({
        userId: m.user_id,
        papel: m.papel as MembroDaTela["papel"],
        nome: m.nome,
        email: m.email,
        ehVoce: m.user_id === usuarioId,
      })),
    convites: (convites.data ?? []).map((c) => conviteDaTela(c, autor)),
    temLinks: Boolean(autorLink.data || familiaLink.data),
  };
}
