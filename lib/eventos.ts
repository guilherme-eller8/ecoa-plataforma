import "server-only";
import { z } from "zod";
import { clienteAdmin, type ClienteAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/tipos";
import { ACOES, PAPEIS } from "./eventos-acoes";

const entradaEsquema = z.object({
  quem: z.uuid().nullable(),
  papel: z.enum(PAPEIS),
  acao: z.enum(ACOES),
  livro: z.uuid().nullable(),
  // Só ids e números. Nunca e-mail, nome ou texto livre.
  detalhes: z
    .record(
      z.string(),
      z.union([z.string().max(64), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
});

export type EntradaEvento = z.input<typeof entradaEsquema>;
type Opcoes = { umaVezPorDia?: boolean };

/** Meia-noite de hoje em Brasília (UTC-3, sem horário de verão desde 2019). */
export function inicioDoDiaBrasilia(agora: Date = new Date()) {
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(
      brasilia.getUTCFullYear(),
      brasilia.getUTCMonth(),
      brasilia.getUTCDate(),
      3,
    ),
  );
}

/**
 * Porta única de escrita em events. Nunca derruba a ação principal: em falha, loga e devolve ok=false.
 */
export async function registrarEvento(
  entrada: EntradaEvento,
  opcoes: Opcoes = {},
  cliente?: ClienteAdmin,
): Promise<{ ok: boolean }> {
  const valido = entradaEsquema.safeParse(entrada);
  if (!valido.success) {
    console.error("[eventos] entrada inválida", {
      acao: entrada.acao,
      problemas: valido.error.issues.length,
    });
    return { ok: false };
  }
  const { quem, papel, acao, livro, detalhes } = valido.data;

  try {
    const db = cliente ?? clienteAdmin();

    if (opcoes.umaVezPorDia) {
      let busca = db
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("acao", acao)
        .gte("criado_em", inicioDoDiaBrasilia().toISOString());
      busca = quem ? busca.eq("ator_id", quem) : busca.is("ator_id", null);
      busca = livro ? busca.eq("book_id", livro) : busca.is("book_id", null);
      const { count, error } = await busca;
      if (error) throw error;
      if ((count ?? 0) > 0) return { ok: true };
    }

    const { error } = await db.from("events").insert({
      ator_id: quem,
      ator_tipo: papel,
      acao,
      book_id: livro,
      detalhes: (detalhes ?? {}) as Json,
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[eventos] falha ao gravar", {
      acao,
      livro,
      quem,
      erro: (e as Error).message,
    });
    return { ok: false };
  }
}
