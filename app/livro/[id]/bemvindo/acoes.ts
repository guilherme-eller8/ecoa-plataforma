"use server";

// Boas-vindas (P82): *Deixar sua mensagem* abre o /m do livro. Reaproveita pegarLink, que já
// deixa qualquer membro gerar o primeiro link e grava gerou_link_mensagem.
import { redirect } from "next/navigation";
import { linkDeMensagens } from "@/lib/mensagens/dados";
import { pegarLink } from "../mensagens/acoes";

export async function abrirMinhaMensagem(livroId: string): Promise<void> {
  const r = await pegarLink(livroId);
  // Corrida com outro membro gerando o link ao mesmo tempo: o link já existe, é só reler.
  const url = r.ok ? r.dados.url : await linkDeMensagens(livroId);
  redirect(url ?? `/livro/${livroId}`);
}
