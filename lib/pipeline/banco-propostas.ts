import "server-only";
// Leituras e escritas das propostas (prompt 9) com a chave secreta. O livro vem sempre da
// proposta ou da história, nunca de fora. Design: docs/designs/ia-sob-controle.md.
import type { Estrutura } from "@/lib/ai/schemas";
import { TAMANHO_PADRAO } from "@/lib/config";
import { normalizarTexto } from "@/lib/editor/conteudo";
import type { Mudanca } from "@/lib/editor/propostas";
import { clienteAdmin, type ClienteAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/tipos";
import type { BancoPropostas, PropostaDoBanco } from "./propostas";

const json = (v: unknown) => v as Json;

function falhar(onde: string, error: { code?: string } | null): never {
  throw new Error(`banco:${onde}:${error?.code ?? "?"}`);
}

/** O texto atual da história (o salvo, ou a última versão), como o editor o vê. */
export async function textoAtualDaHistoria(db: ClienteAdmin, historia: string) {
  const { data: s } = await db
    .from("stories")
    .select("texto")
    .eq("id", historia)
    .maybeSingle();
  let conteudo: unknown = s?.texto ?? null;
  if (!conteudo) {
    const { data: v } = await db
      .from("story_versions")
      .select("conteudo")
      .eq("story_id", historia)
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle();
    conteudo = v?.conteudo ?? null;
  }
  return normalizarTexto(conteudo).paragrafos;
}

export function bancoPropostas(
  db: ClienteAdmin = clienteAdmin(),
): BancoPropostas {
  return {
    async proposta(id) {
      const { data, error } = await db
        .from("story_proposals")
        .select(
          "id, story_id, book_id, tipo, estado, tamanho, pedido, gravacoes",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) falhar("proposta", error);
      if (!data) return null;
      return {
        id: data.id,
        historia: data.story_id,
        livro: data.book_id,
        tipo: data.tipo,
        estado: data.estado,
        tamanho: (data.tamanho ?? TAMANHO_PADRAO) as PropostaDoBanco["tamanho"],
        pedido: (data.pedido ?? {}) as Record<string, unknown>,
        gravacoes: data.gravacoes ?? [],
      };
    },

    async propostaDeAudio(historia) {
      const { data } = await db
        .from("story_proposals")
        .select("id")
        .eq("story_id", historia)
        .eq("tipo", "audio")
        .eq("estado", "gerando")
        .maybeSingle();
      return data?.id ?? null;
    },

    textoAtual: (historia) => textoAtualDaHistoria(db, historia),

    async mesclarEstrutura(historia, nova) {
      const { data } = await db
        .from("stories")
        .select("estrutura")
        .eq("id", historia)
        .maybeSingle();
      const atual = (data?.estrutura ?? null) as Estrutura | null;
      const conhecidos = new Set(atual?.falantes.map((f) => f.falante));
      const junta: Estrutura = {
        falantes: [
          ...(atual?.falantes ?? []),
          ...nova.falantes.filter((f) => !conhecidos.has(f.falante)),
        ],
        vazios: [...new Set([...(atual?.vazios ?? []), ...nova.vazios])],
        mudancasDeAssunto: atual?.mudancasDeAssunto ?? [],
      };
      const { error } = await db
        .from("stories")
        .update({ estrutura: json(junta) })
        .eq("id", historia)
        .eq("estado", "pronta");
      if (error) falhar("estrutura", error);
    },

    async gravar(id, r) {
      const { data, error } = await db.rpc("servico_gravar_proposta", {
        p_proposta: id,
        p_mudancas: json(r.mudancas),
        p_ordem: r.ordem,
        p_marcacoes: json(r.marcacoes),
        p_pronta: r.pronta,
        p_modelos: r.modelos ? json(r.modelos) : null,
        p_hash: r.hash ? json(r.hash) : null,
      });
      if (error) falhar("gravar_proposta", error);
      return Boolean(data);
    },

    async mudancas(id) {
      const { data } = await db
        .from("story_proposals")
        .select("mudancas, ordem")
        .eq("id", id)
        .maybeSingle();
      if (!data?.mudancas) return null;
      return {
        mudancas: data.mudancas as unknown as Mudanca[],
        ordem: data.ordem ?? null,
      };
    },

    async falhar(id, codigo) {
      const { data, error } = await db.rpc("servico_falhar_proposta", {
        p_proposta: id,
        p_erro: codigo,
      });
      if (error) falhar("falhar_proposta", error);
      return Boolean(data);
    },
  };
}
