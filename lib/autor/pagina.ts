import "server-only";
import { connection } from "next/server";
import { tokenValido } from "@/lib/links-formato";
import { assinarLeitura } from "@/lib/storage/assinar";
import { clienteAnonimo } from "@/lib/supabase/anonimo";
import { esquemaPaginaDoAutor, type PaginaDoAutor } from "./tipos";

/**
 * O que a área do autor mostra. Lê pela porta autor_pagina (cliente anônimo, o banco confere
 * o token) e só então assina a foto e o áudio de quem sugeriu que a própria porta devolveu.
 * null = link inválido ou trocado.
 */
export async function paginaDoAutor(
  token: string,
): Promise<PaginaDoAutor | null> {
  await connection();
  if (!tokenValido.safeParse(token).success) return null;
  const { data, error } = await clienteAnonimo().rpc("autor_pagina", {
    p_token: token,
  });
  if (error || !data) return null;
  const p = esquemaPaginaDoAutor.safeParse(data);
  if (!p.success) return null;
  const [fotos, audios] = await Promise.all([
    assinarLeitura(
      "acervo",
      p.data.perguntas.flatMap((x) => (x.foto ? [x.foto] : [])),
    ),
    assinarLeitura(
      "causos",
      p.data.perguntas.flatMap((x) =>
        x.sugestao_audio ? [x.sugestao_audio] : [],
      ),
    ),
  ]);
  return {
    nome: p.data.nome?.trim() || "",
    consentiu: p.data.consentiu,
    aberto: p.data.aberto,
    perguntas: p.data.perguntas.map((x) => ({
      id: x.id,
      tipo: x.tipo,
      texto: x.texto,
      fotoUrl: x.foto ? (fotos.get(x.foto) ?? null) : null,
      sugestaoNome: x.sugestao_nome,
      sugestaoAudioUrl: x.sugestao_audio
        ? (audios.get(x.sugestao_audio) ?? null)
        : null,
    })),
  };
}
