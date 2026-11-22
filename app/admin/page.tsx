import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminCompras,
  type LinhaCompra,
} from "@/components/telas/admin-compras";
import {
  AdminProcessamento,
  type CustoDoLivro,
  type Esperando,
  type Falha,
} from "@/components/telas/admin-processamento";
import { TelaAdmin, type LinhaAdmin } from "@/components/telas/tela-admin";
import { emReais } from "@/lib/ai/custo";
import {
  ADERENCIA_MAX_HISTORIAS,
  FILA_PARADA_MIN,
  MAX_ARQUIVO_MIN,
} from "@/lib/config";
import { estadoEfetivo } from "@/lib/plano";
import { usuarioAtual } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/admin";
import { lerEmBlocos } from "@/lib/supabase/paginar";
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

  const { data: dadosCompras, error: erroCompras } = await clienteAdmin().rpc(
    "admin_listar_compras",
  );
  if (erroCompras) throw new Error("Não deu para carregar as compras.");
  const compras: LinhaCompra[] = (dadosCompras ?? []).map((c) => ({
    id: c.id,
    criadoEm: c.criado_em,
    email: c.email,
    valorCentavos: c.valor_centavos,
    meio: c.meio,
    parcelas: c.parcelas,
    estado: c.estado,
    alertas: c.alertas,
    acessoEnviado: Boolean(c.acesso_enviado_em),
    livro: c.book_id,
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
      compras={<AdminCompras compras={compras} />}
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
    // Somado no banco: a API devolve no máximo 1.000 linhas, e a soma no servidor ficava
    // abaixo do real sem avisar.
    db.rpc("admin_custos_por_livro"),
    // Em blocos: a API corta cada pedido em max_rows (Evals 1A).
    lerEmBlocos<{ book_id: string }>(
      (de, ate) =>
        db
          .from("stories")
          .select("book_id")
          .eq("estado", "pronta")
          .order("id")
          .range(de, ate),
      ADERENCIA_MAX_HISTORIAS,
    ).then((data) => ({ data })),
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
  for (const u of usos ?? [])
    porLivro.set(u.book_id, {
      autor: autor(u.book_id),
      reais: emReais(Number(u.custo_usd)),
      historias: 0,
      minutos: Number(u.minutos_audio ?? 0),
    });
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
                : // Evals 1A: a varredura já reenviou e nada começou (o alerta por e-mail
                  // roda no Inngest; esta é a defesa se o próprio Inngest parar).
                  Date.now() - Date.parse(r.recebido_em ?? "") >
                    FILA_PARADA_MIN * 60_000
                  ? "fila parada: confira o sync do Inngest"
                  : "na fila",
        quando: r.recebido_em ?? new Date().toISOString(),
      })),
    custos: [...porLivro.values()].sort((a, b) => b.reais - a.reais),
  };
}
