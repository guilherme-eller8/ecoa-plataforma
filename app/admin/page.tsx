import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminProcessamento,
  type CustoDoLivro,
  type Esperando,
  type Falha,
} from "@/components/telas/admin-processamento";
import { TelaAdmin, type LinhaAdmin } from "@/components/telas/tela-admin";
import { emReais } from "@/lib/ai/custo";
import { MAX_ARQUIVO_MIN } from "@/lib/config";
import { estadoEfetivo } from "@/lib/plano";
import { usuarioAtual } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/admin";
import {
  ativarPlano,
  processarAgora,
  reenviarAcesso,
  renovarPlano,
  tentarDeNovo,
} from "./acoes";

export const metadata: Metadata = {
  title: "Admin · Ecoa Memórias",
  robots: { index: false },
};

// O proxy.ts já devolve 404 para quem não é admin. Aqui confere de novo antes de usar a chave secreta.
export default function PaginaAdmin() {
  return (
    <Suspense>
      <Admin />
    </Suspense>
  );
}

async function Admin() {
  const usuario = await usuarioAtual();
  if (!usuario?.ehAdmin) notFound();

  const { data, error } = await clienteAdmin().rpc("admin_listar_livros");
  if (error) throw new Error("Não deu para carregar os livros.");

  const livros: LinhaAdmin[] = (data ?? []).map((l) => ({
    id: l.id,
    autorNome: l.autor_nome,
    email: l.responsavel_email,
    estado: estadoEfetivo(l),
    venceEm: l.plano_vence_em,
  }));

  const p = await processamento(
    new Map(livros.map((l) => [l.id, l.autorNome ?? "(sem nome)"])),
  );
  return (
    <TelaAdmin
      livros={livros}
      ativar={ativarPlano}
      renovar={renovarPlano}
      reenviar={reenviarAcesso}
      processamento={
        <AdminProcessamento
          {...p}
          tentarDeNovo={tentarDeNovo}
          processar={processarAgora}
        />
      }
    />
  );
}

/** Falhas, gravações sem história (30 dias) e custo por livro. Só códigos, nunca texto. */
async function processamento(autorDe: Map<string, string>) {
  const db = clienteAdmin();
  const desde = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const [
    { data: falhas },
    { data: recebidas },
    { data: usos },
    { data: prontas },
  ] = await Promise.all([
    db
      .from("stories")
      .select("id, book_id, erro_etapa, erro, atualizado_em")
      .eq("estado", "falhou")
      .order("atualizado_em", { ascending: false })
      .limit(50),
    db
      .from("recordings")
      .select("id, book_id, origem, duracao_s, recebido_em, lote_id")
      .eq("upload", "recebido")
      .is("processado_em", null)
      .gt("recebido_em", desde)
      .order("recebido_em", { ascending: false })
      .limit(100),
    db
      .from("ai_usage")
      .select("book_id, custo_usd, minutos_audio, etapa")
      .limit(10000),
    db.from("stories").select("book_id").eq("estado", "pronta").limit(10000),
  ]);
  const ids = (recebidas ?? []).map((r) => r.id);
  const { data: comHistoria } = ids.length
    ? await db
        .from("story_recordings")
        .select("recording_id")
        .in("recording_id", ids)
    : { data: [] };
  const ja = new Set((comHistoria ?? []).map((s) => s.recording_id));
  const autor = (livro: string) => autorDe.get(livro) ?? "(livro)";

  const porLivro = new Map<string, CustoDoLivro>();
  for (const u of usos ?? []) {
    const c = porLivro.get(u.book_id) ?? {
      autor: autor(u.book_id),
      reais: 0,
      historias: 0,
      minutos: 0,
    };
    c.reais += emReais(Number(u.custo_usd));
    if (u.etapa === "transcrever") c.minutos += Number(u.minutos_audio ?? 0);
    porLivro.set(u.book_id, c);
  }
  for (const s of prontas ?? []) {
    const c = porLivro.get(s.book_id);
    if (c) c.historias++;
  }

  return {
    falhas: (falhas ?? []).map<Falha>((f) => ({
      id: f.id,
      autor: autor(f.book_id),
      etapa: f.erro_etapa,
      codigo: f.erro,
      quando: f.atualizado_em,
    })),
    esperando: (recebidas ?? [])
      .filter((r) => !ja.has(r.id))
      .map<Esperando>((r) => ({
        id: r.id,
        autor: autor(r.book_id),
        origem: r.origem,
        duracaoS: r.duracao_s,
        // Prompt 7: o motivo provável (o banco decide de verdade ao processar).
        motivo:
          r.duracao_s == null
            ? "sem duração"
            : r.duracao_s > MAX_ARQUIVO_MIN * 60
              ? "passa de 2 h"
              : r.lote_id
                ? "lote: espera os outros (até 6 h)"
                : "na fila",
        quando: r.recebido_em ?? new Date().toISOString(),
      })),
    custos: [...porLivro.values()].sort((a, b) => b.reais - a.reais),
  };
}
