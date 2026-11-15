import "server-only";
import { registrarEvento } from "@/lib/eventos";
import { hashDoToken } from "@/lib/links";
import { clienteAdmin } from "@/lib/supabase/admin";

/**
 * Prompt 15: registra que o link do autor foi aberto (1 por livro e dia), para o painel de
 * aderência separar "nem abriu" de "abriu e não gravou". Só roda com link válido (quem chama
 * já passou por paginaDoAutor). Nunca derruba a página.
 */
export async function registrarEntradaDoAutor(token: string) {
  try {
    const { data } = await clienteAdmin()
      .from("author_access")
      .select("book_id")
      .eq("token_hash", hashDoToken(token))
      .is("revogado_em", null)
      .maybeSingle();
    if (!data) return;
    await registrarEvento(
      { quem: null, papel: "autor", acao: "entrou", livro: data.book_id },
      { umaVezPorDia: true },
    );
  } catch (e) {
    console.error("[autor] entrada não registrada", (e as Error).message);
  }
}
