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
  editar,
  estruturar,
  listasDeChecagem,
  memoria,
  verificar,
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
  ESPERA_EMAIL_MIN,
  INTERVALO_TEXTO_MS,
  MODELO_CAPAZ,
  MODELO_RAPIDO,
  TAMANHO_PADRAO,
} from "@/lib/config";
import { codigoDaIA, ErroPipeline, logarSemTexto } from "./erros";
import type { EstadoHistoria, MensagemCanal } from "./regras";

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

export type Iniciado = {
  historia: string | null;
  estado: EstadoHistoria | null;
  motivo: string | null;
  livro: string | null;
};

export type GravacaoParaTranscrever = {
  livro: string;
  caminho: string;
  nomeArquivo: string;
  duracaoS: number | null;
  segmentoInicial: number;
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
    para: "escrevendo" | "falhou" | "ouvindo",
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
  publicar(livro: string, m: MensagemCanal): Promise<void>;
  avisarPorEmail(
    para: string,
    apelido: string,
    historia: string,
  ): Promise<boolean>;
  registrarEvento(
    acao: "historia_pronta" | "memoria_falhou",
    livro: string,
    historia: string,
  ): Promise<void>;
};

/** O que o pipeline usa do `step` do Inngest. Nos testes, uma versão que só executa. */
export type Passos = {
  run<T>(id: string, fn: () => Promise<T>): Promise<T>;
  sleep(id: string, tempo: string): Promise<void>;
};

export type Resultado =
  | { fim: "esperando"; motivo: string }
  | { fim: "ja_estava"; estado: EstadoHistoria }
  | { fim: "pronta"; historia: string; emailEnviado: boolean };

/** Roda `fn` e converte qualquer erro num ErroPipeline com código fixo. */
async function seguro<T>(etapa: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErroPipeline) throw e;
    logarSemTexto(etapa, e);
    throw new ErroPipeline(etapa, codigoDaIA(e));
  }
}

async function usoDaIA<T>(
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

export async function processarGravacao(
  gravacao: string,
  d: Dependencias,
  step: Passos,
): Promise<Resultado> {
  const ini = await step.run("iniciar", () =>
    seguro("iniciar", async () => {
      const r = await d.banco.iniciar(gravacao);
      if (r.historia && r.livro && r.estado === "ouvindo")
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
  if (ini.estado === "pronta" || ini.estado === "falhou")
    return { fim: "ja_estava", estado: ini.estado };
  const historia = ini.historia;
  const livro = ini.livro;

  await step.run("transcrever", () =>
    seguro("transcrever", async () => {
      if (await d.banco.temTranscricao(gravacao)) return { reaproveitada: true };
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
      const segmentos = segmentar(gravacao, bruta.palavras, g.segmentoInicial);
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
    }),
  );

  await step.run("estruturar", () =>
    seguro("estruturar", async () => {
      if (await d.banco.estrutura(historia)) return { reaproveitada: true };
      const segmentos = await d.banco.segmentosDaHistoria(historia);
      if (segmentos.length === 0)
        throw new ErroPipeline("estruturar", "transcricao_vazia");
      const r = await usoDaIA(
        d,
        { livro, historia, etapa: "estruturar", modelo: MODELO_RAPIDO },
        () => estruturar(d.ia, d.ler, gravacao, segmentos),
      );
      await d.banco.gravarEstrutura(historia, r.dados);
      return { falantes: r.dados.falantes.length };
    }),
  );

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
      const locais = checar(rascunho.edicao, segmentos, listasDeChecagem(d.ler));
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
      const r = await usoDaIA(
        d,
        { livro, historia, etapa: "memoria", modelo: MODELO_RAPIDO },
        () => memoria(d.ia, d.ler, edicao),
      );
      await d.banco.gravarMemoria(
        historia,
        livro,
        r.dados.resumo,
        r.dados.temas,
      );
      const nomes = await d.banco.sugerirNomes(historia, r.dados.nomes);
      return { ok: true, nomes };
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
