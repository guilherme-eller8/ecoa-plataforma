import "server-only";
// Prompt 15: leitura do banco para o painel de aderência. Só o admin chega aqui (a página
// confere antes de chamar); a chave secreta nunca sai do servidor. Sem migration: events e
// stories já existem.
import {
  ADERENCIA_LINHA_DO_TEMPO,
  ADERENCIA_MAX_EVENTOS,
  ADERENCIA_MAX_HISTORIAS,
  ERROS_DIAS,
} from "@/lib/config";
import { lerEventos } from "@/lib/eventos";
import { estadoEfetivo } from "@/lib/plano";
import { clienteAdmin } from "@/lib/supabase/admin";
import type { PlanoEstado } from "@/lib/supabase/tipos";
import { lerEmBlocos } from "@/lib/supabase/paginar";
import {
  acessosPorPessoa,
  funil,
  linhaDoLivro,
  ordenarPorParado,
  type AcessosDaPessoa,
  type EventoLinha,
  type LivroEntrada,
} from "./calculo";
import { errosPorRota, jobsQueFalharam, type EventoDeErro } from "./erros";

async function historiasPorLivro(livro?: string) {
  const db = clienteAdmin();
  // Em blocos: a API corta cada pedido em max_rows (Evals 1A).
  const data = await lerEmBlocos<{ book_id: string; revisada_em: string | null }>(
    (de, ate) => {
      let q = db
        .from("stories")
        .select("book_id, revisada_em")
        .eq("estado", "pronta")
        .order("id")
        .range(de, ate);
      if (livro) q = q.eq("book_id", livro);
      return q;
    },
    ADERENCIA_MAX_HISTORIAS,
  ).catch(() => {
    throw new Error("Não deu para ler as histórias.");
  });
  const mapa = new Map<string, { prontas: number; revisadas: number }>();
  for (const s of data) {
    const c = mapa.get(s.book_id) ?? { prontas: 0, revisadas: 0 };
    c.prontas++;
    if (s.revisada_em) c.revisadas++;
    mapa.set(s.book_id, c);
  }
  return mapa;
}

async function livrosDoAdmin(): Promise<
  {
    id: string;
    autorNome: string | null;
    criadoEm: string;
    email: string | null;
  }[]
> {
  const { data, error } = await clienteAdmin().rpc("admin_listar_livros");
  if (error) throw new Error("Não deu para carregar os livros.");
  return (data ?? []).map((l) => ({
    id: l.id,
    autorNome: l.autor_nome,
    criadoEm: l.criado_em,
    email: l.responsavel_email,
  }));
}

export async function carregarAderencia(agora: Date = new Date()) {
  const db = clienteAdmin();
  const [livros, historias, eventos] = await Promise.all([
    livrosDoAdmin(),
    historiasPorLivro(),
    lerEventos({ soDeLivros: true, limite: ADERENCIA_MAX_EVENTOS }, db),
  ]);

  const porLivro = new Map<string, EventoLinha[]>();
  for (const e of eventos) {
    if (!e.book_id) continue;
    const lista = porLivro.get(e.book_id) ?? [];
    lista.push(e);
    porLivro.set(e.book_id, lista);
  }

  const entradas: LivroEntrada[] = livros.map((l) => ({
    id: l.id,
    autorNome: l.autorNome,
    criadoEm: l.criadoEm,
    prontas: historias.get(l.id)?.prontas ?? 0,
    revisadas: historias.get(l.id)?.revisadas ?? 0,
  }));
  const linhas = entradas.map((l) =>
    linhaDoLivro(l, porLivro.get(l.id) ?? [], agora),
  );

  return {
    linhas: ordenarPorParado(linhas),
    funil: funil(
      entradas,
      linhas,
      new Set(
        eventos
          .filter((e) => e.acao === "livro_publicado" && e.book_id)
          .map((e) => e.book_id),
      ).size,
    ),
    // O painel mostra o que leu; se bateu no teto, avisa em vez de fingir que é tudo.
    truncado: eventos.length >= ADERENCIA_MAX_EVENTOS,
  };
}

export type PessoaDoLivro = AcessosDaPessoa & { nome: string };

/** O cliente numa tela: plano, uso e custo de IA do livro (Evals 1A). Só datas e números. */
export type DadosDoCliente = {
  criadoEm: string;
  plano: PlanoEstado;
  ativadoEm: string | null;
  venceEm: string | null;
  consentiuIaEm: string | null;
  /** Pessoas com login no livro (responsável e co-facilitadores). */
  membros: number;
  prontas: number;
  revisadas: number;
  custoUSD: number;
  minutos: number;
  chamadas: number;
  falhas: number;
};
export type AcaoDaLinhaDoTempo = EventoLinha & { nome: string };

export async function carregarLivro(id: string, agora: Date = new Date()) {
  const db = clienteAdmin();
  const [livros, historias, eventos, membros, plano, custo] = await Promise.all([
    livrosDoAdmin(),
    historiasPorLivro(id),
    lerEventos({ livro: id, limite: ADERENCIA_MAX_EVENTOS }, db),
    db.from("book_members").select("user_id, papel").eq("book_id", id),
    db
      .from("books")
      .select(
        "criado_em, plano_estado, plano_vence_em, plano_ativado_em, ia_consentimento_em",
      )
      .eq("id", id)
      .maybeSingle(),
    // Somado no banco (Evals 1A); o filtro vai para a API, não para o servidor.
    db.rpc("admin_custos_por_livro").eq("book_id", id).maybeSingle(),
  ]);
  const livro = livros.find((l) => l.id === id);
  if (!livro) return null;
  const lista: EventoLinha[] = eventos;

  // Membros pelo e-mail (só o admin vê); autor e família não têm identidade.
  const emails = new Map<string, string>();
  await Promise.all(
    (membros.data ?? []).map(async (m) => {
      const { data } = await db.auth.admin.getUserById(m.user_id);
      if (data.user?.email) emails.set(m.user_id, data.user.email);
    }),
  );
  const nomeDe = (e: Pick<EventoLinha, "ator_tipo" | "ator_id">) => {
    if (e.ator_tipo === "autor") return "Autor";
    if (e.ator_tipo === "familia") return "Família";
    if (e.ator_tipo === "sistema") return "Sistema";
    if (e.ator_tipo === "admin") return "Admin";
    return (e.ator_id && emails.get(e.ator_id)) || "(membro)";
  };

  const entrada: LivroEntrada = {
    id,
    autorNome: livro.autorNome,
    criadoEm: livro.criadoEm,
    prontas: historias.get(id)?.prontas ?? 0,
    revisadas: historias.get(id)?.revisadas ?? 0,
  };
  const p = plano.data;
  const c = custo.data;
  const cliente: DadosDoCliente = {
    criadoEm: livro.criadoEm,
    plano: p ? estadoEfetivo(p, agora) : "pendente",
    ativadoEm: p?.plano_ativado_em ?? null,
    venceEm: p?.plano_vence_em ?? null,
    consentiuIaEm: p?.ia_consentimento_em ?? null,
    membros: (membros.data ?? []).length,
    prontas: entrada.prontas,
    revisadas: entrada.revisadas,
    custoUSD: Number(c?.custo_usd ?? 0),
    minutos: Number(c?.minutos_audio ?? 0),
    chamadas: Number(c?.chamadas ?? 0),
    falhas: Number(c?.falhas ?? 0),
  };
  return {
    livro: { id, autorNome: livro.autorNome, email: livro.email },
    cliente,
    linha: linhaDoLivro(entrada, lista, agora),
    pessoas: acessosPorPessoa(lista, agora).map<PessoaDoLivro>((p) => ({
      ...p,
      nome: nomeDe({ ator_tipo: p.papel, ator_id: p.atorId }),
    })),
    linhaDoTempo: lista
      .slice(0, ADERENCIA_LINHA_DO_TEMPO)
      .map<AcaoDaLinhaDoTempo>((e) => ({ ...e, nome: nomeDe(e) })),
  };
}

export async function carregarErros(agora: Date = new Date()) {
  const desde = new Date(
    agora.getTime() - ERROS_DIAS * 24 * 3600_000,
  ).toISOString();
  const db = clienteAdmin();
  const [eventos, livros] = await Promise.all([
    lerEventos(
      { acoes: ["job_falhou", "erro_servidor"], desde, limite: 2000 },
      db,
    ),
    livrosDoAdmin(),
  ]);
  const lista: EventoDeErro[] = eventos;
  const autorDe = new Map(
    livros.map((l) => [l.id, l.autorNome ?? "(sem nome)"]),
  );
  return {
    jobs: jobsQueFalharam(lista).map((j) => ({
      ...j,
      autor: j.livroId ? (autorDe.get(j.livroId) ?? "(livro)") : null,
    })),
    rotas: errosPorRota(lista, agora),
  };
}
