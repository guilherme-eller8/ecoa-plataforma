import "server-only";
// Evals 1A: leitura do banco para as páginas do admin. Somas no banco (admin_uso_por_dia,
// admin_primeira_palavra); linhas só em blocos (a API corta em max_rows). Só o admin chega
// aqui: a página confere antes de chamar, e a chave secreta nunca sai do servidor.
import { diaBrasilia } from "@/lib/aderencia/calculo";
import { carregarAderencia } from "@/lib/aderencia/dados";
import {
  ACOES_DE_CRIACAO,
  ADERENCIA_MAX_EVENTOS,
  ADERENCIA_MAX_HISTORIAS,
  ATIVACAO_DIAS,
  EVALS_DIAS,
  EVALS_FAIXAS_AUDIO_MIN,
  EVALS_SEMANAS,
  FILA_PARADA_MIN,
  LIVRO_PARADO_DIAS,
  RETENCAO_SEMANAS,
} from "@/lib/config";
import { lerEventos } from "@/lib/eventos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { lerEmBlocos } from "@/lib/supabase/paginar";
import type {
  DadosAdocao,
  LivroParaConversar,
} from "@/components/telas/tela-evals-adocao";
import type { DadosCusto } from "@/components/telas/tela-evals";
import {
  ativacao,
  horasAtePrimeiraPronta,
  livrosAtivos,
  primeiroPorLivro,
  quemMantem,
  retencaoPorCoorte,
  valorEntregue,
} from "./adocao";
import {
  faixasCompletas,
  falhasPorCodigo,
  gastoPorSemana,
  projetarPorHabito,
  resumoDeCusto,
  segundaDe,
  taxa,
  type FalhaLida,
  type LinhaUso,
} from "./custo";

const DIA_MS = 24 * 3600_000;

export async function carregarCusto(
  agora: Date = new Date(),
): Promise<DadosCusto> {
  const db = clienteAdmin();
  const hoje = diaBrasilia(agora);
  const desde30 = diaBrasilia(
    new Date(agora.getTime() - (EVALS_DIAS - 1) * DIA_MS),
  );
  const desdeSemanas = segundaDe(
    diaBrasilia(new Date(agora.getTime() - (EVALS_SEMANAS - 1) * 7 * DIA_MS)),
  );
  const desdeIso = new Date(
    agora.getTime() - EVALS_DIAS * DIA_MS,
  ).toISOString();

  const [uso, palavra, historias, falhas] = await Promise.all([
    db.rpc("admin_uso_por_dia", {
      p_desde: desdeSemanas < desde30 ? desdeSemanas : desde30,
      p_ate: hoje,
    }),
    db.rpc("admin_primeira_palavra", {
      p_desde: desdeIso,
      p_faixas_min: [...EVALS_FAIXAS_AUDIO_MIN],
      p_parada_ms: FILA_PARADA_MIN * 60_000,
    }),
    db
      .from("stories")
      .select("id", { count: "exact", head: true })
      .gte("pronta_em", desdeIso),
    lerEmBlocos<FalhaLida>(
      (de, ate) =>
        db
          .from("ai_usage")
          .select("etapa, erro_codigo")
          .eq("ok", false)
          .gte("criado_em", desdeIso)
          .order("id")
          .range(de, ate),
      50_000,
    ),
  ]);
  if (uso.error || palavra.error || historias.error)
    throw new Error("Não deu para somar o uso de IA.");

  const linhas: LinhaUso[] = (uso.data ?? []).map((l) => ({
    ...l,
    chamadas: Number(l.chamadas),
    falhas: Number(l.falhas),
    repetidas: Number(l.repetidas),
    custo_usd: Number(l.custo_usd),
    custo_falhas_usd: Number(l.custo_falhas_usd),
    minutos_audio: Number(l.minutos_audio),
    tokens_entrada: Number(l.tokens_entrada),
    tokens_saida: Number(l.tokens_saida),
    tokens_cache_lido: Number(l.tokens_cache_lido),
    tokens_cache_gravado: Number(l.tokens_cache_gravado),
  }));
  const ultimos30 = linhas.filter((l) => l.dia >= desde30);
  const nHistorias = historias.count ?? 0;

  return {
    dias: EVALS_DIAS,
    historias: nHistorias,
    resumo: resumoDeCusto(ultimos30, nHistorias),
    semanas: gastoPorSemana(linhas, hoje, EVALS_SEMANAS),
    projecao: projetarPorHabito(ultimos30),
    faixas: faixasCompletas(
      (palavra.data ?? []).map((f) => ({
        faixa: Number(f.faixa),
        esperas: Number(f.esperas),
        p50_ms: f.p50_ms,
        p95_ms: f.p95_ms,
        paradas: Number(f.paradas),
      })),
      EVALS_FAIXAS_AUDIO_MIN,
    ),
    falhas: falhasPorCodigo(falhas),
  };
}

export async function carregarAdocao(
  agora: Date = new Date(),
): Promise<DadosAdocao> {
  const db = clienteAdmin();
  const [livros, historias, eventos, aderencia] = await Promise.all([
    lerEmBlocos<{ id: string; plano_ativado_em: string | null }>(
      (de, ate) =>
        db
          .from("books")
          .select("id, plano_ativado_em")
          .order("id")
          .range(de, ate),
      100_000,
    ),
    lerEmBlocos<{
      book_id: string;
      pronta_em: string | null;
      revisada_em: string | null;
    }>(
      (de, ate) =>
        db
          .from("stories")
          .select("book_id, pronta_em, revisada_em")
          .not("pronta_em", "is", null)
          .order("id")
          .range(de, ate),
      ADERENCIA_MAX_HISTORIAS,
    ),
    lerEventos(
      {
        soDeLivros: true,
        acoes: [
          ...ACOES_DE_CRIACAO,
          "historia_revisada",
          "livro_publicado",
          "qr_tocou",
          "compartilhada_tocada",
        ],
        limite: ADERENCIA_MAX_EVENTOS,
      },
      db,
    ),
    carregarAderencia(agora),
  ]);

  const deAdocao = livros.map((l) => ({
    id: l.id,
    ativadoEm: l.plano_ativado_em,
  }));
  const primeiraRevisada = primeiroPorLivro(
    historias.map((h) => ({ book_id: h.book_id, em: h.revisada_em })),
  );
  const primeiraPronta = primeiroPorLivro(
    historias.map((h) => ({ book_id: h.book_id, em: h.pronta_em })),
  );
  const coortes = retencaoPorCoorte(deAdocao, eventos, agora);
  const s4 = coortes.flatMap((c) => {
    const s = c.semanas[RETENCAO_SEMANAS - 1];
    return s ? [s] : [];
  });
  const ativacaoDoLivro = new Map(deAdocao.map((l) => [l.id, l.ativadoEm]));

  // Quem precisa de conversa: parado (mesma regra da Aderência) ou sem a 1ª história revisada
  // depois do prazo de ativação. A Aderência já tem o detalhe; aqui só o motivo.
  const conversar: LivroParaConversar[] = aderencia.linhas.flatMap((l) => {
    const ativado = ativacaoDoLivro.get(l.id);
    const semAtivar =
      ativado &&
      !primeiraRevisada.has(l.id) &&
      Date.parse(ativado) + ATIVACAO_DIAS * DIA_MS <= agora.getTime();
    if (!l.parado && !semAtivar) return [];
    const motivo = l.parado
      ? `Parado há ${l.paradoHaDias} dias (${LIVRO_PARADO_DIAS} ou mais sem ação)`
      : `Sem história revisada em ${ATIVACAO_DIAS} dias`;
    return [{ id: l.id, autorNome: l.autorNome, motivo }];
  });

  return {
    livros: deAdocao.filter((l) => l.ativadoEm).length,
    ativos: livrosAtivos(deAdocao, eventos, agora),
    ativacao: ativacao(deAdocao, primeiraRevisada, agora),
    primeiraPronta: horasAtePrimeiraPronta(deAdocao, primeiraPronta),
    retencaoS4: taxa(
      s4.reduce((t, s) => t + s.n, 0),
      s4.reduce((t, s) => t + s.de, 0),
    ),
    coortes,
    funil: aderencia.funil,
    quem: quemMantem(eventos, agora, EVALS_DIAS),
    valor: valorEntregue(eventos, agora, EVALS_DIAS),
    conversar,
  };
}
