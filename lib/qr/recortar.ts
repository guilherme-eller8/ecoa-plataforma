import "server-only";
// Recorte do áudio do QR (seção 5.2). Cada passo devolve só caminhos, tempos e a fonte (T36).
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MAX_AUDIO_MB } from "@/lib/config";
import { clienteAdmin } from "@/lib/supabase/admin";
import { cortar, type EntradaCorte } from "./cortar";
import { TrechosQr } from "./tipos";
import {
  demuxerDoTipo,
  trechosDaGravacao,
  type SegmentoTempo,
  type Trecho,
} from "./trechos";

export type PlanoRecorte = {
  livro: string;
  fonte: string;
  gravacoes: { caminho: string; demuxer: string; trechos: Trecho[] }[];
};

export function caminhoDoRecorte(livro: string, codigo: string, fonte: string) {
  return `livros/${livro}/${codigo}-${fonte.slice(0, 12)}.m4a`;
}

/** Passo 1: o que cortar. null = QR desligado ou sem áudio (nada a fazer). */
export async function planejarRecorte(
  codigo: string,
): Promise<PlanoRecorte | null> {
  const db = clienteAdmin();
  const { data, error } = await db.rpc("servico_qr_trechos", {
    p_codigo: codigo,
  });
  if (error) throw new Error("recorte:trechos");
  const t = TrechosQr.parse(data);
  if (t.desativado || !t.gravacoes.length) return null;
  const comTrecho = t.gravacoes
    .filter((g) => g.segmentos !== null)
    .map((g) => g.recording_id);
  const tempos = new Map<string, SegmentoTempo[]>();
  if (comTrecho.length) {
    const { data: tr, error: e2 } = await db
      .from("transcripts")
      .select("recording_id, segmentos")
      .in("recording_id", comTrecho);
    if (e2) throw new Error("recorte:transcricao");
    for (const x of tr ?? [])
      tempos.set(
        x.recording_id,
        ((x.segmentos as SegmentoTempo[]) ?? []).map((s) => ({
          id: s.id,
          inicio: s.inicio,
          fim: s.fim,
        })),
      );
  }
  return {
    livro: t.book_id,
    fonte: t.fonte,
    gravacoes: t.gravacoes.map((g) => {
      const demuxer = demuxerDoTipo(g.content_type);
      if (!demuxer) throw new Error("recorte:tipo_desconhecido");
      if (g.segmentos !== null && !tempos.has(g.recording_id))
        throw new Error("recorte:sem_transcricao");
      return {
        caminho: g.caminho,
        demuxer,
        trechos: trechosDaGravacao(
          g.segmentos,
          tempos.get(g.recording_id) ?? [],
          g.duracao_s,
        ),
      };
    }),
  };
}

/** Passo 2: baixa os originais para /tmp, corta e sobe para o bucket qr. */
export async function cortarESubir(
  codigo: string,
  plano: PlanoRecorte,
): Promise<{ caminho: string; duracao: number }> {
  const db = clienteAdmin();
  const pasta = await mkdtemp(join(tmpdir(), "qr-"));
  try {
    const entradas: EntradaCorte[] = [];
    for (const g of plano.gravacoes) {
      const { data, error } = await db.storage
        .from("audios")
        .download(g.caminho);
      if (error || !data) throw new Error("recorte:download");
      if (data.size > MAX_AUDIO_MB * 1024 * 1024)
        throw new Error("recorte:arquivo_grande");
      const arquivo = join(pasta, randomUUID());
      await writeFile(arquivo, Buffer.from(await data.arrayBuffer()));
      for (const trecho of g.trechos)
        entradas.push({ arquivo, demuxer: g.demuxer, trecho });
    }
    const saida = join(pasta, "recorte.m4a");
    const duracao = await cortar(entradas, saida);
    const bytes = await readFile(saida);
    if (bytes.length > MAX_AUDIO_MB * 1024 * 1024)
      throw new Error("recorte:saida_grande");
    const caminho = caminhoDoRecorte(plano.livro, codigo, plano.fonte);
    const { error } = await db.storage
      .from("qr")
      .upload(caminho, bytes, { contentType: "audio/mp4", upsert: true });
    if (error) throw new Error("recorte:upload");
    return { caminho, duracao };
  } finally {
    await rm(pasta, { recursive: true, force: true });
  }
}

/** Passo 3: grava no banco (que confere fonte e duração) e apaga o recorte anterior. */
export async function gravarRecorte(
  codigo: string,
  fonte: string,
  r: { caminho: string; duracao: number },
): Promise<"gravado" | "fonte_velha"> {
  const db = clienteAdmin();
  const { data, error } = await db.rpc("servico_qr_audio_pronto", {
    p_codigo: codigo,
    p_caminho: r.caminho,
    p_fonte: fonte,
    p_duracao_s: r.duracao,
  });
  if (error)
    throw new Error(
      `recorte:${error.message === "qr_recorte_longo" ? "longo" : "gravar"}`,
    );
  const linha = data?.[0];
  if (!linha?.gravado) {
    await db.storage.from("qr").remove([r.caminho]);
    return "fonte_velha";
  }
  if (linha.anterior) await db.storage.from("qr").remove([linha.anterior]);
  return "gravado";
}
