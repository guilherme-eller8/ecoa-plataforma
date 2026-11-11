// npm run lab -- --baixar <historia_id>: traz a versão da IA de uma história da plataforma
// para lab/saidas/, no formato que o --comparar já entende (D6 do design do prompt 6).
// O texto fica só no computador (lab/ está no .gitignore).
// Não usa lib/supabase/admin.ts: ele importa "server-only", que não roda fora do Next.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Edicao, Marcacao, Segmento } from "@/lib/ai/schemas";
import { ErroUsuario } from "./glossario";
import type { ResultadoTamanho } from "./pipeline";
import { renderizarIaMd, VERSAO_SAIDA, type SaidaIA } from "./saidas";

export type DadosBaixados = {
  historia: string;
  arquivo: string;
  geradaEm: string;
  provedor: string;
  modeloTranscricao: string;
  modelos: { rapido: string; capaz: string };
  hashPrompts: Record<string, string>;
  tamanho: string;
  edicao: Edicao;
  marcacoes: Marcacao[];
  segmentos: Segmento[];
};

export function idDaPasta(historia: string) {
  return `plataforma-${historia.slice(0, 8)}`;
}

export function montarSaida(d: DadosBaixados): SaidaIA {
  return {
    versao: VERSAO_SAIDA,
    historia: idDaPasta(d.historia),
    arquivo: d.arquivo,
    geradaEm: d.geradaEm,
    simulado: false,
    provedor: d.provedor,
    modeloTranscricao: d.modeloTranscricao,
    modelos: d.modelos,
    hashPrompts: d.hashPrompts,
    tamanho: d.tamanho,
    edicao: d.edicao,
    marcacoes: d.marcacoes,
    segmentos: d.segmentos,
  };
}

/** Grava ia.json e ia.md. Se a família já corrigiu (editado.md), não toca em nada. */
export function gravarBaixada(dirSaidas: string, saida: SaidaIA): string {
  const dir = join(dirSaidas, saida.historia);
  mkdirSync(dir, { recursive: true });
  if (existsSync(join(dir, "editado.md"))) return dir;
  writeFileSync(join(dir, "ia.json"), JSON.stringify(saida, null, 2));
  writeFileSync(
    join(dir, "ia.md"),
    renderizarIaMd({
      edicao: saida.edicao,
      marcacoes: saida.marcacoes,
    } as ResultadoTamanho),
  );
  return dir;
}

export async function baixarHistoria(
  historia: string,
  dirSaidas: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = env.SUPABASE_SECRET_KEY;
  if (!url || !chave)
    throw new ErroUsuario(
      "Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY no .env.local.",
    );
  if (!/^[0-9a-f-]{36}$/.test(historia))
    throw new ErroUsuario("Use o id da história (o que aparece no endereço).");
  const db = createClient(url, chave, { auth: { persistSession: false } });

  const { data: v } = await db
    .from("story_versions")
    .select("conteudo, marcacoes, modelos, hash_prompts, tamanho, criado_em")
    .eq("story_id", historia)
    .eq("numero", 1)
    .maybeSingle();
  if (!v)
    throw new ErroUsuario("Essa história ainda não tem a versão da IA (está pronta?).");
  const { data: srs } = await db
    .from("story_recordings")
    .select("recording_id, ordem")
    .eq("story_id", historia)
    .order("ordem");
  const ids = (srs ?? []).map((s) => s.recording_id as string);
  const [{ data: ts }, { data: recs }] = await Promise.all([
    db.from("transcripts").select("recording_id, segmentos, provedor, modelo").in("recording_id", ids),
    db.from("recordings").select("id, nome_arquivo").in("id", ids),
  ]);
  const porId = new Map((ts ?? []).map((t) => [t.recording_id as string, t]));
  const modelos = (v.modelos ?? {}) as Record<string, string>;
  const saida = montarSaida({
    historia,
    arquivo: (recs ?? []).map((r) => r.nome_arquivo).join(", ") || historia,
    geradaEm: v.criado_em as string,
    provedor: (porId.get(ids[0])?.provedor as string) ?? "elevenlabs",
    modeloTranscricao: modelos.transcricao ?? (porId.get(ids[0])?.modelo as string) ?? "",
    modelos: { rapido: modelos.rapido ?? "", capaz: modelos.capaz ?? "" },
    hashPrompts: (v.hash_prompts ?? {}) as Record<string, string>,
    tamanho: v.tamanho as string,
    edicao: v.conteudo as Edicao,
    marcacoes: (v.marcacoes ?? []) as Marcacao[],
    segmentos: ids.flatMap((id) => (porId.get(id)?.segmentos ?? []) as Segmento[]),
  });
  return gravarBaixada(dirSaidas, saida);
}
