// Orquestra o lab: para cada áudio, transcreve (com cache), estrutura, edita e verifica.
import { basename, extname } from "node:path";
import { MODELO_CAPAZ, MODELO_RAPIDO, TAMANHOS_TEXTO } from "@/lib/config";
import { hashPrompts, type LeitorPrompt } from "@/lib/ai/carregar-prompt";
import type { ClienteIA } from "@/lib/ai/claude";
import { custoClaudeUSD, custoTranscricaoUSD, type Uso } from "@/lib/ai/custo";
import {
  checar,
  editar,
  estruturar,
  listasDeChecagem,
  palavrasComConteudo,
  verificar,
  type Tamanho,
} from "@/lib/ai/etapas";
import {
  nomesDoGlossario,
  type Edicao,
  type Estrutura,
  type Glossario,
  type Marcacao,
  type Segmento,
} from "@/lib/ai/schemas";
import { contarPalavras, segmentar } from "@/lib/ai/segmentar";
import type { Transcritor } from "@/lib/ai/transcricao";
import { chaveTranscricao, gravarCache, lerCache } from "./cache";

export const PROMPTS_USADOS = [
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
];

export type Etapa = { ms: number; uso?: Uso; custoUSD: number };

export type ResultadoTamanho = {
  tamanho: Tamanho;
  edicao: Edicao;
  marcacoes: Marcacao[];
  naoLocalizadas: number;
  palavras: number;
  palavrasAlvo: number;
  msPrimeiraPalavraChamada: number | null;
  msPrimeiraPalavraArquivo: number | null;
  editar: Etapa;
  verificar: Etapa;
};

export type ResultadoHistoria = {
  id: string;
  arquivo: string;
  minutos: number;
  provedor: string;
  modeloTranscricao: string;
  transcricaoDoCache: boolean;
  transcricao: Etapa;
  segmentos: Segmento[];
  estrutura: Estrutura | null;
  estruturar: Etapa;
  tamanhos: ResultadoTamanho[];
  erro: string | null;
};

export type Rodada = {
  geradaEm: string;
  simulado: boolean;
  provedor: string;
  modelos: { rapido: string; capaz: string };
  hashPrompts: Record<string, string>;
  historias: ResultadoHistoria[];
  msTotal: number;
};

export type Dependencias = {
  ia: ClienteIA;
  transcrever: Transcritor;
  chaveProvedor: string;
  modeloTranscricao: string;
  carregarAudio: (
    caminho: string,
  ) => Promise<{ audio: Uint8Array; minutos: number }>;
  ler: LeitorPrompt;
  dirCache: string;
};

export function idHistoria(arquivo: string): string {
  return basename(arquivo, extname(arquivo))
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const etapaVazia = (): Etapa => ({ ms: 0, custoUSD: 0 });

async function processarHistoria(
  caminho: string,
  p: {
    provedor: string;
    tamanhos: Tamanho[];
    semCache: boolean;
    glossario: Glossario;
  },
  d: Dependencias,
): Promise<ResultadoHistoria> {
  const arquivo = basename(caminho);
  const inicioArquivo = Date.now();
  const r: ResultadoHistoria = {
    id: idHistoria(arquivo),
    arquivo,
    minutos: 0,
    provedor: p.provedor,
    modeloTranscricao: d.modeloTranscricao,
    transcricaoDoCache: false,
    transcricao: etapaVazia(),
    segmentos: [],
    estrutura: null,
    estruturar: etapaVazia(),
    tamanhos: [],
    erro: null,
  };

  try {
    const { audio, minutos } = await d.carregarAudio(caminho);
    r.minutos = minutos;
    const dicas = nomesDoGlossario(p.glossario);
    const chave = chaveTranscricao(
      audio,
      p.provedor,
      d.modeloTranscricao,
      dicas,
    );
    let t = p.semCache ? null : lerCache(d.dirCache, chave);
    r.transcricaoDoCache = t !== null;
    if (!t) {
      const ini = Date.now();
      const bruta = await d.transcrever(audio, arquivo, {
        chave: d.chaveProvedor,
        modelo: d.modeloTranscricao,
        dicas,
      });
      t = { ...bruta, minutos, ms: Date.now() - ini };
      gravarCache(d.dirCache, chave, t);
    }
    r.transcricao = {
      ms: r.transcricaoDoCache ? 0 : t.ms,
      custoUSD:
        p.provedor === "simulado"
          ? 0
          : custoTranscricaoUSD(p.provedor, minutos),
    };

    r.segmentos = segmentar(arquivo, t.palavras);
    if (r.segmentos.length === 0) throw new Error("a transcrição veio vazia");

    const est = await estruturar(d.ia, d.ler, arquivo, r.segmentos);
    r.estrutura = est.dados;
    r.estruturar = {
      ms: est.ms,
      uso: est.uso,
      custoUSD: custoClaudeUSD(MODELO_RAPIDO, est.uso),
    };

    const listas = listasDeChecagem(d.ler);
    const totalPalavras = palavrasComConteudo(r.segmentos, est.dados);

    r.tamanhos = await Promise.all(
      p.tamanhos.map(async (tamanho) => {
        let msArquivo: number | null = null;
        const ed = await editar(d.ia, d.ler, {
          segmentos: r.segmentos,
          estrutura: est.dados,
          glossario: p.glossario,
          tamanho,
          aoPrimeiraPalavra: () => (msArquivo ??= Date.now() - inicioArquivo),
        });
        const ver = await verificar(d.ia, d.ler, {
          edicao: ed.dados,
          segmentos: r.segmentos,
          estrutura: est.dados,
        });
        const marcacoes = [
          ...checar(ed.dados, r.segmentos, listas),
          ...ver.marcacoes,
        ].sort((a, b) => a.paragrafo - b.paragrafo || a.inicio - b.inicio);
        return {
          tamanho,
          edicao: ed.dados,
          marcacoes,
          naoLocalizadas: ver.naoLocalizadas,
          palavras: ed.dados.paragrafos.reduce(
            (n, par) => n + contarPalavras(par.texto),
            0,
          ),
          palavrasAlvo: Math.round(totalPalavras * TAMANHOS_TEXTO[tamanho]),
          msPrimeiraPalavraChamada: ed.msPrimeiraPalavra,
          msPrimeiraPalavraArquivo: msArquivo,
          editar: {
            ms: ed.ms,
            uso: ed.uso,
            custoUSD: custoClaudeUSD(MODELO_CAPAZ, ed.uso),
          },
          verificar: {
            ms: ver.resposta.ms,
            uso: ver.resposta.uso,
            custoUSD: custoClaudeUSD(MODELO_CAPAZ, ver.resposta.uso),
          },
        };
      }),
    );
  } catch (e) {
    r.erro = e instanceof Error ? e.message : String(e);
  }
  return r;
}

/** Roda várias promessas com no máximo `limite` ao mesmo tempo, mantendo a ordem. */
export async function emParalelo<T, R>(
  itens: T[],
  limite: number,
  f: (t: T) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await f(itens[i]);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.max(1, Math.min(limite, itens.length)) },
      trabalhador,
    ),
  );
  return resultados;
}

export async function rodarLab(
  audios: string[],
  p: {
    provedor: string;
    tamanhos: Tamanho[];
    semCache: boolean;
    glossario: Glossario;
    concorrencia: number;
    simulado: boolean;
  },
  d: Dependencias,
): Promise<Rodada> {
  const inicio = Date.now();
  const historias = await emParalelo([...audios].sort(), p.concorrencia, (a) =>
    processarHistoria(a, p, d),
  );
  return {
    geradaEm: new Date().toISOString(),
    simulado: p.simulado,
    provedor: p.provedor,
    modelos: { rapido: MODELO_RAPIDO, capaz: MODELO_CAPAZ },
    hashPrompts: hashPrompts(d.ler, PROMPTS_USADOS),
    historias,
    msTotal: Date.now() - inicio,
  };
}
