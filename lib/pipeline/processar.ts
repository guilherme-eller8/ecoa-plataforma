// Orquestração do pipeline para UMA gravação avulsa (prompt 6, seção 6.2 do design).
// Puro: recebe banco, IA, transcritor, canal e e-mail por injeção. A função do Inngest
// (lib/inngest/funcoes.ts) só passa o `step` e as dependências reais.
//
// Regra de ouro (T36): nenhum passo devolve texto da fala. Só ids, contagens e códigos.
import { hashPrompts, type LeitorPrompt } from "@/lib/ai/carregar-prompt";
import { ErroIA, type ClienteIA, type RespostaIA } from "@/lib/ai/claude";
import { custoClaudeUSD, custoTranscricaoUSD, type Uso } from "@/lib/ai/custo";
import {
  checar,
  dividir,
  editar,
  estruturar,
  listasDeChecagem,
  memoria,
  palavrasComConteudo,
  verificar,
  type GravacaoDaDivisao,
} from "@/lib/ai/etapas";
import { extrairTextoParcial } from "@/lib/ai/parcial";
import {
  nomesDoGlossario,
  type Edicao,
  type Estrutura,
  type Glossario,
  type Marcacao,
  type Palavra,
  type Segmento,
} from "@/lib/ai/schemas";
import { segmentar } from "@/lib/ai/segmentar";
import type { Transcritor } from "@/lib/ai/transcricao";
import {
  ESPERA_EMAIL_DIVISAO_MIN,
  ESPERA_EMAIL_MIN,
  INTERVALO_TEXTO_MS,
  MAX_HISTORIA_ESCRITA_MIN,
  MAX_HISTORIAS_DIVISAO,
  MIN_FALA_HISTORIA_S,
  MIN_PALAVRAS_HISTORIA,
  MODELO_CAPAZ,
  MODELO_RAPIDO,
  TAMANHO_PADRAO,
} from "@/lib/config";
import {
  falaDe,
  limparDivisao,
  type PerguntaCandidata,
  type Proposta,
} from "@/lib/divisao/limpar";
import { codigoDaIA, ErroPipeline, logarSemTexto } from "./erros";
import { proporAudio, type DependenciasPropostas } from "./propostas";
import type { EstadoHistoria, MensagemCanal, MensagemProposta } from "./regras";

export const PROMPTS_DO_PIPELINE = [
  "_regras",
  "_estilo",
  "_conectores",
  "_anti-slop",
  "contexto-livro",
  "estruturar",
  "estruturar-entrada",
  "editar",
  "editar-entrada",
  "verificar",
  "verificar-entrada",
  "memoria",
  "memoria-entrada",
];

export const PROMPTS_DA_DIVISAO = [
  "estruturar",
  "estruturar-entrada",
  "dividir",
  "dividir-entrada",
];

export type Iniciado = {
  historia: string | null;
  estado: EstadoHistoria | null;
  motivo: string | null;
  livro: string | null;
  /** Gravações do contêiner, em ordem (prompt 7). Execução antiga, sem a lista: só a do evento. */
  gravacoes?: string[];
};

/** O que o pipeline precisa saber da história para decidir sem repetir custo (prompt 7). */
export type InfoHistoria = {
  livro: string;
  estado: EstadoHistoria;
  temDivisao: boolean; // proposta gravada (ou confirmada)
  divisaoDe: string | null; // nasceu de uma divisão
  promptId: string | null;
  sugestaoDecidida: boolean; // já tem sugestão, ou foi ignorada
};

export type PerguntaPendente = { id: string; texto: string };

export type GravacaoParaTranscrever = {
  livro: string;
  caminho: string;
  nomeArquivo: string;
  duracaoS: number | null;
  segmentoInicial: number;
  /** Rótulo curto da gravação na história ("g1"): o modelo repete o falante ("g1:speaker_0"). */
  rotulo: string;
};

export type LinhaUso = {
  livro: string;
  historia?: string | null;
  gravacao?: string | null;
  etapa: string;
  provedor: string;
  modelo: string;
  ok: boolean;
  uso?: Uso;
  minutosAudio?: number | null;
  custoUSD: number;
  ms?: number | null;
  msPrimeiraPalavra?: number | null;
  idRequisicao?: string | null;
};

export type Rascunho = { edicao: Edicao; marcacoes?: Marcacao[] };

/** Tudo o que o pipeline lê e escreve. Implementação real: lib/pipeline/banco.ts. */
export interface BancoPipeline {
  iniciar(gravacao: string): Promise<Iniciado>;
  info(historia: string): Promise<InfoHistoria | null>;
  /** Grava o 1º id da gravação no contêiner (maior id já transcrito + 1) e toca a história. */
  fixarSegmentoInicial(historia: string, gravacao: string): Promise<number>;
  /** Rótulo, minutos e pergunta (id e texto) de cada gravação do contêiner, em ordem. */
  gravacoesDaHistoria(historia: string): Promise<
    (GravacaoDaDivisao & {
      perguntaId: string | null;
    })[]
  >;
  perguntasPendentes(livro: string): Promise<PerguntaPendente[]>;
  proporDivisao(
    historia: string,
    proposta: Proposta & { hash_prompts: Record<string, string> },
  ): Promise<boolean>;
  sugerirPergunta(historia: string, pergunta: string): Promise<boolean>;
  gravacaoParaTranscrever(
    gravacao: string,
    historia: string,
  ): Promise<GravacaoParaTranscrever | null>;
  temTranscricao(gravacao: string): Promise<boolean>;
  gravarTranscricao(t: {
    gravacao: string;
    livro: string;
    provedor: string;
    modelo: string;
    segmentos: Segmento[];
    palavras: Palavra[];
    minutos: number;
  }): Promise<void>;
  segmentosDaHistoria(historia: string): Promise<Segmento[]>;
  estrutura(historia: string): Promise<Estrutura | null>;
  gravarEstrutura(historia: string, e: Estrutura): Promise<void>;
  mudarEtapa(
    historia: string,
    para: "escrevendo" | "falhou" | "ouvindo" | "dividindo",
    erro?: { etapa: string; codigo: string },
  ): Promise<boolean>;
  rascunho(historia: string): Promise<Rascunho | null>;
  gravarRascunho(historia: string, r: Rascunho): Promise<void>;
  concluir(
    historia: string,
    tamanho: string,
    modelos: Record<string, string>,
    hash: Record<string, string>,
  ): Promise<boolean>;
  contexto(livro: string): Promise<{ glossario: Glossario; historias: string }>;
  gravarMemoria(
    historia: string,
    livro: string,
    resumo: string,
    temas: string[],
  ): Promise<void>;
  sugerirNomes(
    historia: string,
    nomes: { nome: string; tipo: "pessoa" | "lugar" }[],
  ): Promise<number>;
  registrarUso(linha: LinhaUso): Promise<void>;
  versaoDaIA(historia: string): Promise<Edicao | null>;
  foiVista(historia: string): Promise<boolean>;
  avisoDoLivro(
    livro: string,
  ): Promise<{ email: string | null; apelido: string } | null>;
}

export type Dependencias = {
  banco: BancoPipeline;
  ia: ClienteIA;
  ler: LeitorPrompt;
  transcrever: Transcritor;
  provedor: string;
  modeloTranscricao: string;
  chaveTranscricao: string;
  baixarAudio(caminho: string): Promise<Uint8Array>;
  publicar(livro: string, m: MensagemCanal | MensagemProposta): Promise<void>;
  avisarPorEmail(
    para: string,
    apelido: string,
    historia: string,
  ): Promise<boolean>;
  registrarEvento(
    acao: "historia_pronta" | "memoria_falhou" | "divisao_proposta",
    livro: string,
    historia: string,
    detalhes?: Record<string, number>,
  ): Promise<void>;
  /** E-mail da divisão esperando confirmação (D8), sem título. */
  avisarDivisao?(
    para: string,
    apelido: string,
    historia: string,
  ): Promise<boolean>;
};

/** O que o pipeline usa do `step` do Inngest. Nos testes, uma versão que só executa. */
export type Passos = {
  run<T>(id: string, fn: () => Promise<T>): Promise<T>;
  sleep(id: string, tempo: string): Promise<void>;
};

export type Resultado =
  | { fim: "esperando"; motivo: string }
  | { fim: "proposta"; proposta: string }
  | { fim: "ja_estava"; estado: EstadoHistoria }
  | { fim: "pronta"; historia: string; emailEnviado: boolean }
  | {
      fim: "separar";
      historia: string;
      historias: number;
      emailEnviado: boolean;
    };

/** Roda `fn` e converte qualquer erro num ErroPipeline com código fixo. */
export async function seguro<T>(
  etapa: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErroPipeline) throw e;
    logarSemTexto(etapa, e);
    throw new ErroPipeline(etapa, codigoDaIA(e));
  }
}

export async function usoDaIA<T>(
  d: Dependencias,
  base: Omit<LinhaUso, "ok" | "custoUSD" | "provedor">,
  chamada: () => Promise<RespostaIA<T>>,
): Promise<RespostaIA<T>> {
  try {
    const r = await chamada();
    await d.banco.registrarUso({
      ...base,
      provedor: "anthropic",
      ok: true,
      uso: r.uso,
      custoUSD: custoClaudeUSD(base.modelo, r.uso),
      ms: r.ms,
      msPrimeiraPalavra: r.msPrimeiraPalavra,
      idRequisicao: r.idRequisicao,
    });
    return r;
  } catch (e) {
    const uso = e instanceof ErroIA ? e.uso : undefined;
    await d.banco.registrarUso({
      ...base,
      provedor: "anthropic",
      ok: false,
      uso,
      custoUSD: uso ? custoClaudeUSD(base.modelo, uso) : 0,
    });
    throw e;
  }
}

/** Transcreve uma gravação do contêiner, com os ids continuando os da anterior (prompt 7). */
export async function transcreverUma(
  d: Dependencias,
  gravacao: string,
  historia: string,
  livro: string,
) {
  if (await d.banco.temTranscricao(gravacao)) return { reaproveitada: true };
  const segmentoInicial = await d.banco.fixarSegmentoInicial(
    historia,
    gravacao,
  );
  const g = await d.banco.gravacaoParaTranscrever(gravacao, historia);
  if (!g) throw new ErroPipeline("transcrever", "audio_ausente");
  const { glossario } = await d.banco.contexto(livro);
  const audio = await d.baixarAudio(g.caminho);
  const inicio = Date.now();
  let bruta;
  try {
    bruta = await d.transcrever(audio, g.nomeArquivo, {
      chave: d.chaveTranscricao,
      modelo: d.modeloTranscricao,
      dicas: nomesDoGlossario(glossario),
    });
  } catch (e) {
    logarSemTexto("transcrever", e);
    await d.banco.registrarUso({
      livro,
      historia,
      gravacao,
      etapa: "transcrever",
      provedor: d.provedor,
      modelo: d.modeloTranscricao,
      ok: false,
      custoUSD: 0,
      ms: Date.now() - inicio,
    });
    throw new ErroPipeline("transcrever", "scribe_falhou");
  }
  const ultimo = bruta.palavras.at(-1)?.fim ?? 0;
  const minutos = (g.duracaoS ?? ultimo) / 60;
  // Rótulo curto, não o uuid: o modelo precisa repetir o falante exatamente (estruturar).
  const segmentos = segmentar(
    g.rotulo,
    bruta.palavras,
    segmentoInicial || g.segmentoInicial,
  );
  await d.banco.gravarTranscricao({
    gravacao,
    livro,
    provedor: d.provedor,
    modelo: d.modeloTranscricao,
    segmentos,
    palavras: bruta.palavras,
    minutos,
  });
  await d.banco.registrarUso({
    livro,
    historia,
    gravacao,
    etapa: "transcrever",
    provedor: d.provedor,
    modelo: d.modeloTranscricao,
    ok: true,
    minutosAudio: minutos,
    custoUSD: custoTranscricaoUSD(d.provedor, minutos),
    ms: Date.now() - inicio,
  });
  return { segmentos: segmentos.length };
}

/**
 * Pipeline de uma gravação (ou do grupo dela: lote, conversa em partes). Prompt 6 + 7:
 * iniciar → transcrever (cada gravação, em ordem) → estruturar → decidir → escrever ou dividir.
 */
export async function processarGravacao(
  gravacao: string,
  d: Dependencias,
  step: Passos,
): Promise<Resultado> {
  const ini = await step.run("iniciar", () =>
    seguro("iniciar", async () => {
      const r = await d.banco.iniciar(gravacao);
      if (r.historia && r.livro && r.estado === "ouvindo" && !r.motivo)
        await d.publicar(r.livro, {
          tipo: "etapa",
          historia: r.historia,
          etapa: "ouvindo",
        });
      return r;
    }),
  );
  if (!ini.historia || !ini.livro)
    return { fim: "esperando", motivo: ini.motivo ?? "nao_recebido" };
  // Prompt 9: áudio acrescentado a uma história pronta vira proposta, nunca história nova.
  if (ini.motivo === "acrescentar") {
    const dp = d as DependenciasPropostas;
    if (!dp.propostas) throw new ErroPipeline("iniciar", "erro_inesperado");
    const historiaPronta = ini.historia;
    const id = await step.run("proposta-audio", () =>
      seguro("iniciar", () => dp.propostas.propostaDeAudio(historiaPronta)),
    );
    if (!id) return { fim: "ja_estava", estado: "pronta" };
    const r = await proporAudio(id, dp, step);
    return { fim: "proposta", proposta: r.proposta };
  }
  if (
    ini.motivo === "dividida" ||
    ini.estado === "pronta" ||
    ini.estado === "falhou" ||
    ini.estado === "separar"
  )
    return { fim: "ja_estava", estado: ini.estado ?? "pronta" };
  const historia = ini.historia;
  const livro = ini.livro;
  const gravacoes = ini.gravacoes?.length ? ini.gravacoes : [gravacao];

  // O 1º passo mantém o nome do prompt 6: execuções em voo continuam valendo.
  for (const [n, g] of gravacoes.entries())
    await step.run(n === 0 ? "transcrever" : `transcrever:${n + 1}`, () =>
      seguro("transcrever", () => transcreverUma(d, g, historia, livro)),
    );

  await step.run("estruturar", () =>
    seguro("estruturar", async () => {
      if (await d.banco.estrutura(historia)) return { reaproveitada: true };
      const segmentos = await d.banco.segmentosDaHistoria(historia);
      if (segmentos.length === 0)
        throw new ErroPipeline("estruturar", "transcricao_vazia");
      const rotulos = [...new Set(segmentos.map((s) => s.arquivo))].join(", ");
      const r = await usoDaIA(
        d,
        { livro, historia, etapa: "estruturar", modelo: MODELO_RAPIDO },
        () => estruturar(d.ia, d.ler, rotulos, segmentos),
      );
      await d.banco.gravarEstrutura(historia, r.dados);
      return { falantes: r.dados.falantes.length };
    }),
  );

  // Decide uma vez (passo memorizado): a resposta não muda numa nova execução do job.
  const caminho = await step.run("decidir", () =>
    seguro("decidir", async () => {
      const info = await d.banco.info(historia);
      if (!info || info.temDivisao || info.divisaoDe) return "parar" as const;
      if (info.estado === "escrevendo") return "escrever" as const;
      const estrutura = await d.banco.estrutura(historia);
      // Pouca fala não vale uma divisão: vai para a escrita (que para em "audio_sem_fala").
      const segmentos = await d.banco.segmentosDaHistoria(historia);
      if (
        !estrutura ||
        palavrasComConteudo(segmentos, estrutura) < MIN_PALAVRAS_HISTORIA
      )
        return "escrever" as const;
      return gravacoes.length > 1 || estrutura.mudancasDeAssunto.length > 0
        ? ("dividir" as const)
        : ("escrever" as const);
    }),
  );
  if (caminho === "parar") {
    const info = await d.banco.info(historia);
    return { fim: "ja_estava", estado: info?.estado ?? "separar" };
  }

  if (caminho === "dividir") {
    const div = await step.run("dividir", () =>
      seguro("dividir", () =>
        dividirHistoria(d, historia, livro, gravacoes.length),
      ),
    );
    if (div.seguir) return escreverHistoria(historia, livro, d, step);
    await step.sleep("esperar-divisao", `${ESPERA_EMAIL_DIVISAO_MIN}m`);
    const emailEnviado = await step.run("avisar-divisao", async () => {
      try {
        const info = await d.banco.info(historia);
        if (info?.estado !== "separar" || !d.avisarDivisao) return false;
        const aviso = await d.banco.avisoDoLivro(livro);
        if (!aviso?.email) return false;
        return await d.avisarDivisao(aviso.email, aviso.apelido, historia);
      } catch (e) {
        logarSemTexto("avisar-divisao", e);
        return false;
      }
    });
    return { fim: "separar", historia, historias: div.historias, emailEnviado };
  }

  return escreverHistoria(historia, livro, d, step);
}

/**
 * Propõe a divisão do contêiner (modelo capaz) e grava a proposta no banco. Nunca chama a IA
 * duas vezes: se a proposta já existe, só devolve as contagens. `seguir` = gravação única que
 * deu 1 história: vai direto para a escrita, sem tela.
 */
async function dividirHistoria(
  d: Dependencias,
  historia: string,
  livro: string,
  nGravacoes: number,
): Promise<{ historias: number; seguir: boolean }> {
  const antes = await d.banco.info(historia);
  if (!antes) throw new ErroPipeline("dividir", "sem_historia");
  if (antes.estado === "separar" || antes.temDivisao)
    return { historias: 0, seguir: false };
  if (antes.estado === "ouvindo") {
    await d.banco.mudarEtapa(historia, "dividindo");
    await d.publicar(livro, { tipo: "etapa", historia, etapa: "separando" });
  } else if (antes.estado !== "dividindo")
    throw new ErroPipeline("dividir", "estado_invalido");

  const [segmentos, estrutura, ctx, gravs, pendentes] = await Promise.all([
    d.banco.segmentosDaHistoria(historia),
    d.banco.estrutura(historia),
    d.banco.contexto(livro),
    d.banco.gravacoesDaHistoria(historia),
    d.banco.perguntasPendentes(livro),
  ]);
  if (!estrutura || segmentos.length === 0)
    throw new ErroPipeline("dividir", "sem_rascunho");

  // Candidatas: as pendentes (sugestão) e as escolhidas no envio (definitivas).
  const ligadas = new Map<string, string[]>();
  for (const g of gravs)
    if (g.perguntaId)
      ligadas.set(g.perguntaId, [
        ...(ligadas.get(g.perguntaId) ?? []),
        g.rotulo,
      ]);
  const candidatas: (PerguntaCandidata & { texto: string })[] = [
    ...pendentes
      .filter((p) => !ligadas.has(p.id))
      .map((p) => ({ id: p.id, texto: p.texto, ligadaA: [] })),
    ...[...ligadas.entries()].map(([id, rotulos]) => ({
      id,
      texto: gravs.find((g) => g.perguntaId === id)?.pergunta ?? "",
      ligadaA: rotulos,
    })),
  ];

  const r = await usoDaIA(
    d,
    { livro, historia, etapa: "dividir", modelo: MODELO_CAPAZ },
    () =>
      dividir(d.ia, d.ler, {
        autor: ctx.glossario.autor.apelido ?? ctx.glossario.autor.nome,
        segmentos,
        estrutura,
        gravacoes: gravs,
        perguntas: candidatas.map((c) => c.texto),
        minFalaS: MIN_FALA_HISTORIA_S,
        maxFalaMin: MAX_HISTORIA_ESCRITA_MIN,
      }),
  );
  const proposta = limparDivisao(r.dados, {
    segmentos,
    perguntas: candidatas,
    minFalaS: MIN_FALA_HISTORIA_S,
    maxHistorias: MAX_HISTORIAS_DIVISAO,
  });
  const porId = new Map(segmentos.map((s) => [s.id, s]));
  const fala = falaDe(
    segmentos.map((s) => s.id),
    porId,
  );

  // Gravação única de 1 assunto que cabe numa escrita: segue direto (D2), com a sugestão.
  if (
    nGravacoes === 1 &&
    proposta.historias.length === 1 &&
    fala <= MAX_HISTORIA_ESCRITA_MIN * 60
  ) {
    const sugerida = proposta.historias[0].sugeridaId;
    if (sugerida) await d.banco.sugerirPergunta(historia, sugerida);
    return { historias: 1, seguir: true };
  }

  const ok = await d.banco.proporDivisao(historia, {
    ...proposta,
    hash_prompts: hashPrompts(d.ler, PROMPTS_DA_DIVISAO),
  });
  if (!ok) {
    const depois = await d.banco.info(historia);
    if (depois?.estado === "separar") return { historias: 0, seguir: false };
    throw new ErroPipeline("dividir", "propor_recusado");
  }
  await d.publicar(livro, { tipo: "etapa", historia, etapa: "conferir" });
  await d.registrarEvento("divisao_proposta", livro, historia, {
    historias: proposta.historias.length,
    gravacoes: nGravacoes,
    minutos: Math.round(fala / 60),
  });
  return { historias: proposta.historias.length, seguir: false };
}

/**
 * Escrita de uma história já transcrita e estruturada (prompt 6): editar → verificar →
 * concluir → memória → e-mail. Usada direto pela gravação e pela função escrever-historia,
 * depois de uma divisão confirmada.
 */
export async function escreverHistoria(
  historia: string,
  livro: string,
  d: Dependencias,
  step: Passos,
): Promise<Resultado> {
  const editado = await step.run("editar", () =>
    seguro("editar", async () => {
      await d.banco.mudarEtapa(historia, "escrevendo");
      await d.publicar(livro, { tipo: "etapa", historia, etapa: "escrevendo" });
      const [segmentos, estrutura, ctx] = await Promise.all([
        d.banco.segmentosDaHistoria(historia),
        d.banco.estrutura(historia),
        d.banco.contexto(livro),
      ]);
      if (!estrutura) throw new ErroPipeline("editar", "sem_rascunho");
      // Sem fala para escrever (só silêncio ou ruído): para aqui, sem pagar o modelo capaz.
      if (palavrasComConteudo(segmentos, estrutura) < MIN_PALAVRAS_HISTORIA)
        throw new ErroPipeline("editar", "audio_sem_fala");
      const r = await usoDaIA(
        d,
        { livro, historia, etapa: "editar", modelo: MODELO_CAPAZ },
        () =>
          editar(d.ia, d.ler, {
            segmentos,
            estrutura,
            glossario: ctx.glossario,
            historias: ctx.historias,
            tamanho: TAMANHO_PADRAO,
            intervaloTextoMs: INTERVALO_TEXTO_MS,
            aoTexto: async (acumulado, tentativa) => {
              const p = extrairTextoParcial(acumulado);
              if (!p.titulo && p.paragrafos.length === 0) return;
              await d
                .publicar(livro, { tipo: "texto", historia, tentativa, ...p })
                .catch((e) => logarSemTexto("publicar texto", e));
            },
          }),
      );
      await d.banco.gravarRascunho(historia, { edicao: r.dados });
      return {
        paragrafos: r.dados.paragrafos.length,
        msPrimeiraPalavra: r.msPrimeiraPalavra,
      };
    }),
  );

  await step.run("verificar", () =>
    seguro("verificar", async () => {
      const rascunho = await d.banco.rascunho(historia);
      if (!rascunho) throw new ErroPipeline("verificar", "sem_rascunho");
      const segmentos = await d.banco.segmentosDaHistoria(historia);
      const estrutura = (await d.banco.estrutura(historia)) ?? undefined;
      const locais = checar(
        rascunho.edicao,
        segmentos,
        listasDeChecagem(d.ler),
      );
      const ver = await usoDaIA(
        d,
        { livro, historia, etapa: "verificar", modelo: MODELO_CAPAZ },
        async () => {
          const v = await verificar(d.ia, d.ler, {
            edicao: rascunho.edicao,
            segmentos,
            estrutura,
          });
          return { ...v.resposta, dados: v };
        },
      );
      const marcacoes = [...locais, ...ver.dados.marcacoes].sort(
        (a, b) => a.paragrafo - b.paragrafo || a.inicio - b.inicio,
      );
      await d.banco.gravarRascunho(historia, {
        edicao: rascunho.edicao,
        marcacoes,
      });
      return { marcacoes: marcacoes.length };
    }),
  );

  await step.run("concluir", () =>
    seguro("concluir", async () => {
      const ok = await d.banco.concluir(
        historia,
        TAMANHO_PADRAO,
        {
          transcricao: d.modeloTranscricao,
          rapido: MODELO_RAPIDO,
          capaz: MODELO_CAPAZ,
        },
        hashPrompts(d.ler, PROMPTS_DO_PIPELINE),
      );
      if (!ok) throw new ErroPipeline("concluir", "concluir_recusado");
      await d.publicar(livro, { tipo: "etapa", historia, etapa: "revisar" });
      return { paragrafos: editado.paragrafos };
    }),
  );

  // Daqui em diante, nada lança: a história já está pronta (o onFailure não pode desfazê-la).
  await step.run("memoria", async () => {
    try {
      const edicao = await d.banco.versaoDaIA(historia);
      if (!edicao) return { ok: false };
      // Prompt 7: a pergunta pendente que ela parece responder, se ainda não tem nenhuma.
      const info = await d.banco.info(historia);
      const pendentes =
        info && !info.promptId && !info.sugestaoDecidida
          ? await d.banco.perguntasPendentes(livro)
          : [];
      const r = await usoDaIA(
        d,
        { livro, historia, etapa: "memoria", modelo: MODELO_RAPIDO },
        () =>
          memoria(
            d.ia,
            d.ler,
            edicao,
            pendentes.map((p) => p.texto),
          ),
      );
      await d.banco.gravarMemoria(
        historia,
        livro,
        r.dados.resumo,
        r.dados.temas,
      );
      const nomes = await d.banco.sugerirNomes(historia, r.dados.nomes);
      const sugerida =
        r.dados.pergunta != null ? pendentes[r.dados.pergunta - 1] : undefined;
      if (sugerida) await d.banco.sugerirPergunta(historia, sugerida.id);
      return { ok: true, nomes, pergunta: Boolean(sugerida) };
    } catch (e) {
      logarSemTexto("memoria", e);
      await d.registrarEvento("memoria_falhou", livro, historia);
      return { ok: false };
    }
  });

  await step.sleep("esperar", `${ESPERA_EMAIL_MIN}m`);

  const emailEnviado = await step.run("avisar", async () => {
    try {
      if (await d.banco.foiVista(historia)) return false;
      const aviso = await d.banco.avisoDoLivro(livro);
      if (!aviso?.email) return false;
      const ok = await d.avisarPorEmail(aviso.email, aviso.apelido, historia);
      await d.registrarEvento("historia_pronta", livro, historia);
      return ok;
    } catch (e) {
      logarSemTexto("avisar", e);
      return false;
    }
  });

  return { fim: "pronta", historia, emailEnviado };
}
