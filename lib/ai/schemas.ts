// Contratos do pipeline de IA. Reaproveitados pela plataforma (prompt 6 em diante).
import { z } from "zod";

// ── Transcrição ──────────────────────────────────────────────────────────

export type Palavra = {
  texto: string;
  inicio: number; // segundos
  fim: number; // segundos
  falante: string | null;
  confianca: number | null;
};

export type Transcricao = {
  provedor: string;
  modelo: string;
  palavras: Palavra[];
  minutos: number;
  ms: number;
  bruto: unknown;
};

export type Segmento = {
  id: number; // inteiro contínuo entre arquivos; no prompt aparece como S001
  arquivo: string;
  inicio: number;
  fim: number;
  falante: string; // qualificado pelo arquivo: "arquivo:falante"
  texto: string;
};

// ── Lista única de tipos de afirmação (verificador, checagens e taxonomia) ──

export const TIPOS_AFIRMACAO = [
  "fato",
  "nome",
  "data",
  "lugar",
  "numero",
  "emocao",
  "juizo",
  "causa",
  "ordem",
] as const;
export const TipoAfirmacao = z.enum(TIPOS_AFIRMACAO);
export type TipoAfirmacao = z.infer<typeof TipoAfirmacao>;

// ── Saídas do Claude ─────────────────────────────────────────────────────

export const Estrutura = z.object({
  falantes: z.array(
    z.object({
      falante: z.string(),
      papel: z.enum(["autor", "entrevistador", "outro"]),
    }),
  ),
  vazios: z.array(z.number().int()),
  mudancasDeAssunto: z.array(z.number().int()),
});
export type Estrutura = z.infer<typeof Estrutura>;

export const Edicao = z.object({
  titulo: z.string(),
  paragrafos: z.array(
    z.object({
      texto: z.string(),
      fontes: z.array(z.number().int()),
    }),
  ),
  lacunas: z.array(z.object({ pergunta: z.string(), motivo: z.string() })),
});
export type Edicao = z.infer<typeof Edicao>;

export const Verificacao = z.object({
  marcadas: z.array(
    z.object({
      paragrafo: z.number().int(), // começa em 1
      trecho: z.string(),
      tipo: TipoAfirmacao,
      status: z.enum(["parcial", "sem_sustentacao"]),
      motivo: z.string(),
    }),
  ),
});
export type Verificacao = z.infer<typeof Verificacao>;

export const CATEGORIAS_EDICAO = [
  "invencao_removida",
  "transcricao",
  "voz_restaurada",
  "corte_excessivo",
  "informacao_nova",
  "ordem",
  "estilo",
] as const;
export const CategoriaEdicao = z.enum(CATEGORIAS_EDICAO);
export type CategoriaEdicao = z.infer<typeof CategoriaEdicao>;

export const ClassificacaoEdicoes = z.object({
  mudancas: z.array(
    z.object({
      paragrafo: z.number().int(), // índice do par alinhado, começa em 1
      categoria: CategoriaEdicao,
      tipo: TipoAfirmacao.nullable(), // só para invencao_removida
      antes: z.string(),
      depois: z.string(),
      sugestao: z.string(),
    }),
  ),
});
export type ClassificacaoEdicoes = z.infer<typeof ClassificacaoEdicoes>;

// Memória do livro (prompt 6): resumo da história pronta e nomes citados. Prompt 7: a pergunta
// pendente que a história parece responder (número da lista, começa em 1; null = nenhuma).
export const Memoria = z.object({
  resumo: z.string(),
  temas: z.array(z.string()),
  nomes: z.array(
    z.object({ nome: z.string(), tipo: z.enum(["pessoa", "lugar"]) }),
  ),
  pergunta: z.number().int().nullable(),
});
export type Memoria = z.infer<typeof Memoria>;

// Divisão em histórias (prompt 7): faixas de segmentos por história, entre gravações.
export const Divisao = z.object({
  historias: z.array(
    z.object({
      titulo: z.string(),
      trechos: z.array(
        z.object({ de: z.number().int(), ate: z.number().int() }),
      ),
      pergunta: z.number().int().nullable(), // número da lista (P1 = 1); null = nenhuma
    }),
  ),
});
export type Divisao = z.infer<typeof Divisao>;

// ── Marcações ("Confira") ────────────────────────────────────────────────

export type Marcacao = {
  paragrafo: number; // começa em 1
  inicio: number; // caractere no texto do parágrafo
  fim: number;
  trecho: string;
  tipo: TipoAfirmacao | "slop";
  origem: "checagem" | "verificador";
  motivo: string;
};

// ── Glossário do livro (lab/glossario.json) ──────────────────────────────

const Entrada = z.object({
  nome: z.string().min(1),
  apelidos: z.array(z.string()).default([]),
  relacao: z.string().optional(),
});

export const Glossario = z.object({
  autor: z.object({ nome: z.string().min(1), apelido: z.string().optional() }),
  sobre: z.string().default(""),
  pessoas: z.array(Entrada).default([]),
  lugares: z.array(Entrada).default([]),
  consentimento: z
    .object({
      quem: z.string().min(1),
      data: z.string().min(1),
      escopo: z.string().min(1),
      reusoComoExemplo: z.boolean().default(false),
    })
    .optional(),
});
export type Glossario = z.infer<typeof Glossario>;

export function nomesDoGlossario(g: Glossario): string[] {
  const nomes = [g.autor.nome, g.autor.apelido ?? ""];
  for (const e of [...g.pessoas, ...g.lugares])
    nomes.push(e.nome, ...e.apelidos);
  return [...new Set(nomes.filter(Boolean))];
}

export function idSegmento(id: number): string {
  return `S${String(id).padStart(3, "0")}`;
}

// ── IA sob controle (prompt 9) ───────────────────────────────────────────

// Tamanho: o texto inteiro, com `travado` = id de um parágrafo travado no lugar dele.
export const EdicaoComTravados = z.object({
  titulo: z.string(),
  paragrafos: z.array(
    z.object({
      travado: z.string().nullable(),
      texto: z.string(),
      fontes: z.array(z.number().int()),
    }),
  ),
  lacunas: z.array(z.object({ pergunta: z.string(), motivo: z.string() })),
});
export type EdicaoComTravados = z.infer<typeof EdicaoComTravados>;

// Acrescentar áudio: só inserções e trocas sobre o capítulo atual.
export const Integracao = z.object({
  operacoes: z.array(
    z.object({
      tipo: z.enum(["inserir", "substituir"]),
      alvo: z.string().nullable(),
      paragrafos: z.array(
        z.object({ texto: z.string(), fontes: z.array(z.number().int()) }),
      ),
    }),
  ),
});
export type Integracao = z.infer<typeof Integracao>;

// Revisar trecho: só o substituto do trecho escolhido.
export const Revisao = z.object({ substituto: z.string() });
export type Revisao = z.infer<typeof Revisao>;
