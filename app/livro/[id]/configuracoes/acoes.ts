"use server";

// Configurações do livro (prompt 6): confirmação do processamento com IA (P41) e os nomes de
// pessoas e lugares (glossário). Tudo pela sessão: a RLS e as funções conferem de novo.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { CONSENTIMENTO_IA_VERSAO, MAX_HISTORIA_MIN } from "@/lib/config";
import { fraseDoErro } from "@/lib/erros-banco";
import { registrarEvento } from "@/lib/eventos";
import { livroDaAcao } from "@/lib/livro/acesso";
import type { Resposta } from "@/lib/livro/tipos";
import { dispararGravacao } from "@/lib/pipeline/disparo";
import { ORIGENS_AVULSAS } from "@/lib/pipeline/regras";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";

const SEM_ACESSO = { ok: false as const, mensagem: "Você não tem acesso a este livro." };
const FECHADO = { ok: false as const, mensagem: "Este livro não aceita mudanças agora." };

async function paraEscrever(livroId: string) {
  const acesso = await livroDaAcao(livroId);
  if (!acesso) return SEM_ACESSO;
  if (!acesso.podeEscrever) return FECHADO;
  return acesso;
}

function atualizar(livroId: string) {
  revalidatePath(`/livro/${livroId}`, "layout");
}

export async function confirmarProcessamentoIA(livroId: string): Promise<Resposta> {
  const a = await paraEscrever(livroId);
  if ("ok" in a) return a;
  if (a.livro.papel !== "responsavel")
    return { ok: false, mensagem: "Só o responsável pelo livro pode confirmar." };
  const supabase = await clienteSessao();
  const { data, error } = await supabase.rpc("consentir_processamento_ia", {
    p_book: livroId,
    p_versao: CONSENTIMENTO_IA_VERSAO,
  });
  if (error || !data) return { ok: false, mensagem: fraseDoErro(error) };

  after(async () => {
    await registrarEvento({
      quem: a.usuario.id,
      papel: a.livro.papel,
      acao: "consentiu_ia",
      livro: livroId,
    });
    // As gravações que esperavam só por isso entram na fila agora.
    const { data: esperando } = await clienteAdmin()
      .from("recordings")
      .select("id")
      .eq("book_id", livroId)
      .eq("upload", "recebido")
      .is("processado_em", null)
      .is("lote_id", null)
      .in("origem", [...ORIGENS_AVULSAS])
      .lte("duracao_s", MAX_HISTORIA_MIN * 60)
      .limit(50);
    for (const g of esperando ?? []) await dispararGravacao(g.id, "consentimento");
  });
  atualizar(livroId);
  return { ok: true };
}

const nome = z.string().trim().min(1, "Escreva o nome.").max(80);
const apelidos = z
  .array(z.string().trim().min(1).max(80))
  .max(10)
  .default([]);

export async function ajustarNome(
  livroId: string,
  id: string,
  mudanca: { estado?: "aceito" | "recusado"; nome?: string; apelidos?: string[] },
): Promise<Resposta> {
  const a = await paraEscrever(livroId);
  if ("ok" in a) return a;
  const v = z
    .object({
      id: z.uuid(),
      estado: z.enum(["aceito", "recusado"]).optional(),
      nome: nome.optional(),
      apelidos: apelidos.optional(),
    })
    .safeParse({ id, ...mudanca });
  if (!v.success)
    return { ok: false, mensagem: v.error.issues[0]?.message ?? "Confira o nome." };
  const { id: _id, ...campos } = v.data;
  const supabase = await clienteSessao();
  const { error } = await supabase
    .from("glossary_entries")
    .update({ ...campos, ...(campos.nome ? { estado: "aceito" as const } : {}) })
    .eq("id", _id)
    .eq("book_id", livroId);
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  after(() =>
    registrarEvento({
      quem: a.usuario.id,
      papel: a.livro.papel,
      acao: "nome_ajustado",
      livro: livroId,
      detalhes: { estado: campos.estado ?? (campos.nome ? "corrigido" : null) },
    }),
  );
  atualizar(livroId);
  return { ok: true };
}

export async function acrescentarNome(
  livroId: string,
  entrada: { tipo: "pessoa" | "lugar"; nome: string },
): Promise<Resposta> {
  const a = await paraEscrever(livroId);
  if ("ok" in a) return a;
  const v = z
    .object({ tipo: z.enum(["pessoa", "lugar"]), nome })
    .safeParse(entrada);
  if (!v.success)
    return { ok: false, mensagem: v.error.issues[0]?.message ?? "Confira o nome." };
  const supabase = await clienteSessao();
  const { error } = await supabase.from("glossary_entries").insert({
    book_id: livroId,
    tipo: v.data.tipo,
    nome: v.data.nome,
    estado: "aceito",
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  after(() =>
    registrarEvento({
      quem: a.usuario.id,
      papel: a.livro.papel,
      acao: "nome_ajustado",
      livro: livroId,
      detalhes: { estado: "acrescentado" },
    }),
  );
  atualizar(livroId);
  return { ok: true };
}
