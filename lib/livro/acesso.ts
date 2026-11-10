import "server-only";
import { notFound, redirect } from "next/navigation";
import { podeEscrever } from "@/lib/plano";
import {
  livrosDoMembro,
  usuarioAtual,
  type LivroDoMembro,
  type Usuario,
} from "@/lib/sessao";
import { lerConfiguracao } from "./configuracao";

export type LivroComAcesso = {
  usuario: Usuario;
  livro: LivroDoMembro;
  podeEscrever: boolean;
};

/** Para páginas: sem sessão vai para /entrar; livro de outra família é 404. */
export async function livroDaPagina(id: string): Promise<LivroComAcesso> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  const livro = (await livrosDoMembro(usuario.id)).find((l) => l.id === id);
  if (!livro) notFound();
  return { usuario, livro, podeEscrever: podeEscrever(livro) };
}

/** Para ações: devolve null em vez de redirecionar. Filtro explícito, além da RLS. */
export async function livroDaAcao(id: string): Promise<LivroComAcesso | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  const livro = (await livrosDoMembro(usuario.id)).find((l) => l.id === id);
  if (!livro) return null;
  return { usuario, livro, podeEscrever: podeEscrever(livro) };
}

export function nomeDoAutor(
  livro: Pick<LivroDoMembro, "autor_apelido" | "autor_nome">,
) {
  return livro.autor_apelido?.trim() || livro.autor_nome?.trim() || "autor";
}

export function configuracaoDo(livro: LivroDoMembro) {
  return lerConfiguracao(livro.configuracao);
}
