// Propostas da IA (prompt 9): tamanho, acrescentar áudio e revisar trecho. Puro, como
// processar.ts: banco, IA e canal por injeção. Nenhum passo devolve texto da fala (T36): a saída
// da IA fica na própria proposta (servico_gravar_proposta). Design: docs/designs/ia-sob-controle.md.
import { hashPrompts } from "@/lib/ai/carregar-prompt";
import {
  checar,
  editarComTravados,
  estruturar,
  integrar,
  listasDeChecagem,
  revisar,
  verificar,
  type InstrucaoRevisar,
  type Tamanho,
} from "@/lib/ai/etapas";
import type { Estrutura, Segmento } from "@/lib/ai/schemas";
import {
  MAX_AUDIO_EXTRA_MIN,
  MAX_HISTORIA_ESCRITA_MIN,
  MODELO_CAPAZ,
  MODELO_RAPIDO,
} from "@/lib/config";
import type { Paragrafo } from "@/lib/editor/conteudo";
import {
  mudancaDeTrecho,
  mudancasDeAudio,
  mudancasDeTamanho,
  paraUtf16,
  type MarcacaoProposta,
  type Mudanca,
  type TipoProposta,
} from "@/lib/editor/propostas";
import { ErroPipeline } from "./erros";
import {
  seguro,
  transcreverUma,
  usoDaIA,
  type Dependencias,
  type Passos,
} from "./processar";

export const PROMPTS_DAS_PROPOSTAS = [
  "_regras",
  "_estilo",
  "_conectores",
  "_anti-slop",
  "contexto-livro",
  "editar",
  "tamanho-entrada",
  "integrar",
  "integrar-entrada",
  "revisar",
  "revisar-entrada",
  "verificar",
  "verificar-entrada",
  "estruturar",
  "estruturar-entrada",
];

export type PropostaDoBanco = {
  id: string;
  historia: string;
  livro: string;
  tipo: TipoProposta;
  estado: string;
  tamanho: Tamanho;
  pedido: Record<string, unknown>;
  gravacoes: string[];
};

/** O que as propostas leem e escrevem. Implementação real: lib/pipeline/banco-propostas.ts. */
export interface BancoPropostas {
  proposta(id: string): Promise<PropostaDoBanco | null>;
  /** A proposta de áudio "gerando" da história (criada por servico_iniciar_historia). */
  propostaDeAudio(historia: string): Promise<string | null>;
  /** O texto atual, normalizado como o editor (ids p1..pN na versão da IA). */
  textoAtual(historia: string): Promise<Paragrafo[]>;
  /** Junta falantes e vazios do áudio novo à estrutura da história (que já está pronta). */
  mesclarEstrutura(historia: string, e: Estrutura): Promise<void>;
  gravar(
    id: string,
    r: {
      mudancas: Mudanca[];
      ordem: string[] | null;
      marcacoes: MarcacaoProposta[];
      pronta: boolean;
      modelos?: Record<string, string>;
      hash?: Record<string, string>;
    },
  ): Promise<boolean>;
  /** Mudanças guardadas entre passos (proposta ainda "gerando"). */
  mudancas(
    id: string,
  ): Promise<{ mudancas: Mudanca[]; ordem: string[] | null } | null>;
  falhar(id: string, codigo: string): Promise<boolean>;
}

export type DependenciasPropostas = Dependencias & {
  propostas: BancoPropostas;
};

export type ResultadoProposta =
  | { fim: "pronta"; proposta: string; mudancas: number }
  | { fim: "ja_estava"; proposta: string };

function modelos(d: Dependencias): Record<string, string> {
  return {
    transcricao: d.modeloTranscricao,
    rapido: MODELO_RAPIDO,
    capaz: MODELO_CAPAZ,
  };
}

async function avisar(
  d: DependenciasPropostas,
  p: PropostaDoBanco,
  estado: "gerando" | "pronta" | "falhou",
) {
  await d
    .publicar(p.livro, {
      tipo: "proposta",
      historia: p.historia,
      proposta: p.id,
      estado,
    })
    .catch(() => {});
}

/** Confere (checagens + verificador) só os parágrafos que a proposta põe. */
async function verificarNovos(
  d: DependenciasPropostas,
  p: PropostaDoBanco,
  mudancas: Mudanca[],
  segmentos: Segmento[],
  estrutura?: Estrutura,
): Promise<MarcacaoProposta[]> {
  const novos = mudancas.flatMap((m) => m.poe);
  if (!novos.length) return [];
  const edicao = {
    titulo: "",
    paragrafos: novos.map((x) => ({ texto: x.texto, fontes: x.fontes })),
    lacunas: [],
  };
  const locais = checar(edicao, segmentos, listasDeChecagem(d.ler));
  const ver = await usoDaIA(
    d,
    {
      livro: p.livro,
      historia: p.historia,
      etapa: "verificar",
      modelo: MODELO_CAPAZ,
    },
    async () => {
      const v = await verificar(d.ia, d.ler, { edicao, segmentos, estrutura });
      return { ...v.resposta, dados: v };
    },
  );
  return [...locais, ...ver.dados.marcacoes].map(({ paragrafo, ...m }) => ({
    ...m,
    paragrafo_id: novos[paragrafo - 1].id,
  }));
}

async function carregar(d: DependenciasPropostas, id: string) {
  const p = await d.propostas.proposta(id);
  if (!p) throw new ErroPipeline("proposta", "sem_historia");
  return p;
}

// ── Tamanho ──────────────────────────────────────────────────────────────

/** Tamanho: editar a partir da base estruturada com os travados → verificar os novos. */
export async function proporTamanho(
  id: string,
  d: DependenciasPropostas,
  step: Passos,
): Promise<ResultadoProposta> {
  const ini = await step.run("carregar", () =>
    seguro("carregar", () => carregar(d, id)),
  );
  if (ini.estado !== "gerando") return { fim: "ja_estava", proposta: id };

  const editado = await step.run("editar", () =>
    seguro("editar", async () => {
      const p = await carregar(d, id);
      const [segmentos, estrutura, ctx, atual] = await Promise.all([
        d.banco.segmentosDaHistoria(p.historia),
        d.banco.estrutura(p.historia),
        d.banco.contexto(p.livro),
        d.propostas.textoAtual(p.historia),
      ]);
      if (!estrutura || !segmentos.length)
        throw new ErroPipeline("editar", "sem_rascunho");
      const r = await usoDaIA(
        d,
        {
          livro: p.livro,
          historia: p.historia,
          etapa: "tamanho",
          modelo: MODELO_CAPAZ,
        },
        () =>
          editarComTravados(d.ia, d.ler, {
            segmentos,
            estrutura,
            glossario: ctx.glossario,
            historias: ctx.historias,
            tamanho: p.tamanho,
            travados: atual.filter((x) => x.editado),
          }),
      );
      const { mudancas, ordem } = mudancasDeTamanho(
        atual,
        r.dados.paragrafos.map((x) =>
          x.travado
            ? { travado: x.travado }
            : { texto: x.texto, fontes: x.fontes },
        ),
      );
      await d.propostas.gravar(id, {
        mudancas,
        ordem,
        marcacoes: [],
        pronta: false,
      });
      return { mudancas: mudancas.length };
    }),
  );

  await step.run("verificar", () =>
    seguro("verificar", async () => {
      const p = await carregar(d, id);
      const salvo = await d.propostas.mudancas(id);
      if (!salvo) throw new ErroPipeline("verificar", "sem_rascunho");
      const [segmentos, estrutura] = await Promise.all([
        d.banco.segmentosDaHistoria(p.historia),
        d.banco.estrutura(p.historia),
      ]);
      const marcacoes = await verificarNovos(
        d,
        p,
        salvo.mudancas,
        segmentos,
        estrutura ?? undefined,
      );
      const ok = await d.propostas.gravar(id, {
        ...salvo,
        marcacoes,
        pronta: true,
        modelos: modelos(d),
        hash: hashPrompts(d.ler, PROMPTS_DAS_PROPOSTAS),
      });
      if (ok) await avisar(d, p, "pronta");
      return { marcacoes: marcacoes.length };
    }),
  );
  return { fim: "pronta", proposta: id, mudancas: editado.mudancas };
}

// ── Acrescentar áudio ────────────────────────────────────────────────────

/** Áudio novo: transcrever → conferir a duração → estruturar → integrar → verificar. */
export async function proporAudio(
  id: string,
  d: DependenciasPropostas,
  step: Passos,
): Promise<ResultadoProposta> {
  const ini = await step.run("carregar", () =>
    seguro("carregar", async () => {
      const p = await carregar(d, id);
      if (p.estado === "gerando") await avisar(d, p, "gerando");
      return p;
    }),
  );
  if (ini.estado !== "gerando") return { fim: "ja_estava", proposta: id };

  for (const [n, g] of ini.gravacoes.entries())
    await step.run(`transcrever-audio:${n + 1}`, () =>
      seguro("transcrever", () =>
        transcreverUma(d, g, ini.historia, ini.livro),
      ),
    );

  await step.run("estruturar-audio", () =>
    seguro("estruturar", async () => {
      const todos = await d.banco.segmentosDaHistoria(ini.historia);
      const novos = segmentosDe(todos, ini.gravacoes, await rotulos(d, ini));
      if (!novos.length)
        throw new ErroPipeline("estruturar", "transcricao_vazia");
      // A duração declarada pelo navegador não vale como teto: confere a real.
      const fala = (s: Segmento[]) =>
        s.reduce((t, x) => t + (x.fim - x.inicio), 0);
      const porGravacao = new Map<string, Segmento[]>();
      for (const s of novos)
        porGravacao.set(s.arquivo, [...(porGravacao.get(s.arquivo) ?? []), s]);
      const maior = Math.max(
        ...[...porGravacao.values()].map((s) => s.at(-1)!.fim - s[0].inicio),
      );
      if (
        maior > (MAX_AUDIO_EXTRA_MIN + 1) * 60 ||
        fala(todos) > (MAX_HISTORIA_ESCRITA_MIN + 1) * 60
      )
        throw new ErroPipeline("estruturar", "longa");
      const atual = await d.banco.estrutura(ini.historia);
      const temTodos = novos.every((s) =>
        atual?.falantes.some((f) => f.falante === s.falante),
      );
      if (atual && temTodos) return { reaproveitada: true };
      const r = await usoDaIA(
        d,
        {
          livro: ini.livro,
          historia: ini.historia,
          etapa: "estruturar",
          modelo: MODELO_RAPIDO,
        },
        () =>
          estruturar(
            d.ia,
            d.ler,
            [...new Set(novos.map((s) => s.arquivo))].join(", "),
            novos,
          ),
      );
      await d.propostas.mesclarEstrutura(ini.historia, r.dados);
      return { falantes: r.dados.falantes.length };
    }),
  );

  await step.run("integrar", () =>
    seguro("integrar", async () => {
      const p = await carregar(d, id);
      const [todos, estrutura, ctx, atual, rot] = await Promise.all([
        d.banco.segmentosDaHistoria(p.historia),
        d.banco.estrutura(p.historia),
        d.banco.contexto(p.livro),
        d.propostas.textoAtual(p.historia),
        rotulos(d, p),
      ]);
      if (!estrutura) throw new ErroPipeline("integrar", "sem_rascunho");
      const novos = segmentosDe(todos, p.gravacoes, rot);
      const idsNovos = new Set(novos.map((s) => s.id));
      const r = await usoDaIA(
        d,
        {
          livro: p.livro,
          historia: p.historia,
          etapa: "integrar",
          modelo: MODELO_CAPAZ,
        },
        () =>
          integrar(d.ia, d.ler, {
            capitulo: atual,
            segmentosNovos: novos,
            segmentosAntigos: todos.filter((s) => !idsNovos.has(s.id)),
            estrutura,
            glossario: ctx.glossario,
            historias: ctx.historias,
          }),
      );
      const mudancas = mudancasDeAudio(atual, r.dados.operacoes);
      await d.propostas.gravar(id, {
        mudancas,
        ordem: null,
        marcacoes: [],
        pronta: false,
      });
      return { mudancas: mudancas.length };
    }),
  );

  const fim = await step.run("verificar", () =>
    seguro("verificar", async () => {
      const p = await carregar(d, id);
      const salvo = await d.propostas.mudancas(id);
      if (!salvo) throw new ErroPipeline("verificar", "sem_rascunho");
      const [segmentos, estrutura] = await Promise.all([
        d.banco.segmentosDaHistoria(p.historia),
        d.banco.estrutura(p.historia),
      ]);
      const marcacoes = await verificarNovos(
        d,
        p,
        salvo.mudancas,
        segmentos,
        estrutura ?? undefined,
      );
      const ok = await d.propostas.gravar(id, {
        ...salvo,
        marcacoes,
        pronta: true,
        modelos: modelos(d),
        hash: hashPrompts(d.ler, PROMPTS_DAS_PROPOSTAS),
      });
      if (ok) await avisar(d, p, "pronta");
      return { mudancas: salvo.mudancas.length };
    }),
  );
  return { fim: "pronta", proposta: id, mudancas: fim.mudancas };
}

/** Rótulo ("g3") de cada gravação da proposta, para achar os segmentos dela. */
async function rotulos(
  d: Dependencias,
  p: { historia: string; gravacoes: string[] },
) {
  const r = new Map<string, string>();
  for (const g of p.gravacoes) {
    const t = await d.banco.gravacaoParaTranscrever(g, p.historia);
    if (t) r.set(g, t.rotulo);
  }
  return r;
}

function segmentosDe(
  todos: Segmento[],
  gravacoes: string[],
  rot: Map<string, string>,
) {
  const meus = new Set(gravacoes.map((g) => rot.get(g)).filter(Boolean));
  return todos.filter((s) => meus.has(s.arquivo));
}

// ── Revisar trecho (na própria ação do servidor) ─────────────────────────

/** Revisar: um substituto para o trecho → checar e verificar o parágrafo → pronta. */
export async function revisarTrecho(
  id: string,
  d: DependenciasPropostas,
): Promise<ResultadoProposta> {
  const p = await carregar(d, id);
  if (p.estado !== "gerando") return { fim: "ja_estava", proposta: id };
  try {
    const pedido = p.pedido as {
      paragrafo: string;
      inicio: number;
      fim: number;
      instrucao: InstrucaoRevisar;
      texto?: string;
    };
    const [atual, todos, estrutura, ctx] = await Promise.all([
      d.propostas.textoAtual(p.historia),
      d.banco.segmentosDaHistoria(p.historia),
      d.banco.estrutura(p.historia),
      d.banco.contexto(p.livro),
    ]);
    const i = atual.findIndex((x) => x.id === pedido.paragrafo);
    if (i < 0) throw new ErroPipeline("revisar", "proposta_vencida");
    const alvo = atual[i];
    // O banco guarda posições em pontos de código; o JavaScript corta em UTF-16.
    const inicio = paraUtf16(alvo.texto, pedido.inicio);
    const fim = paraUtf16(alvo.texto, pedido.fim);
    const vizinhos = new Set([
      ...alvo.fontes,
      ...(atual[i - 1]?.fontes ?? []),
      ...(atual[i + 1]?.fontes ?? []),
    ]);
    const segmentos = todos.filter((s) => vizinhos.has(s.id));
    const r = await usoDaIA(
      d,
      {
        livro: p.livro,
        historia: p.historia,
        etapa: "revisar",
        modelo: MODELO_CAPAZ,
      },
      () =>
        revisar(d.ia, d.ler, {
          paragrafo: alvo.texto,
          trecho: alvo.texto.slice(inicio, fim),
          antes: atual[i - 1]?.texto ?? null,
          depois: atual[i + 1]?.texto ?? null,
          instrucao: pedido.instrucao,
          textoLivre: pedido.texto ?? null,
          segmentos: segmentos.length ? segmentos : todos,
          estrutura: estrutura ?? undefined,
          glossario: ctx.glossario,
        }),
    );
    const mudancas = mudancaDeTrecho(alvo, inicio, fim, r.dados.substituto);
    const marcacoes = await verificarNovos(
      d,
      p,
      mudancas,
      segmentos.length ? segmentos : todos,
      estrutura ?? undefined,
    );
    await d.propostas.gravar(id, {
      mudancas,
      ordem: null,
      marcacoes,
      pronta: true,
      modelos: modelos(d),
      hash: hashPrompts(d.ler, PROMPTS_DAS_PROPOSTAS),
    });
    return { fim: "pronta", proposta: id, mudancas: mudancas.length };
  } catch (e) {
    const codigo = e instanceof ErroPipeline ? e.codigo : "erro_inesperado";
    await d.propostas.falhar(id, codigo).catch(() => {});
    throw e;
  }
}
