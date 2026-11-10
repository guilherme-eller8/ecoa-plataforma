// Compara a versão da IA com a versão corrigida pela família.
// O mesmo código roda no lab (arquivos) e, no prompt 9, sobre story_versions.
import { MODELO_RAPIDO } from "@/lib/config";
import { montarPrompt, type LeitorPrompt } from "./carregar-prompt";
import { normalizar } from "./checagens";
import type { ClienteIA, RespostaIA } from "./claude";
import { formatarSegmentos } from "./etapas";
import { ClassificacaoEdicoes, type Marcacao, type Segmento } from "./schemas";

export type Par = {
  ia: number | null;
  familia: number | null;
  similaridade: number;
};

function tokens(t: string): string[] {
  return normalizar(t).match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Similaridade de Dice entre os conjuntos de palavras (0 a 1). */
export function similaridade(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (A.size === 0 && B.size === 0) return 1;
  let comuns = 0;
  for (const t of A) if (B.has(t)) comuns++;
  return (2 * comuns) / (A.size + B.size);
}

/**
 * Alinha parágrafos em ordem (programação dinâmica). Pares com similaridade abaixo
 * do mínimo viram parágrafo removido (familia = null) ou acrescentado (ia = null).
 */
export function alinharParagrafos(
  ia: string[],
  familia: string[],
  minimo = 0.3,
): Par[] {
  const n = ia.length;
  const m = familia.length;
  const sim = ia.map((a) => familia.map((b) => similaridade(a, b)));
  const melhor: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const casar =
        sim[i][j] >= minimo ? sim[i][j] + melhor[i + 1][j + 1] : -Infinity;
      melhor[i][j] = Math.max(casar, melhor[i + 1][j], melhor[i][j + 1]);
    }
  }
  const pares: Par[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (
      sim[i][j] >= minimo &&
      melhor[i][j] === sim[i][j] + melhor[i + 1][j + 1]
    ) {
      pares.push({ ia: i, familia: j, similaridade: sim[i][j] });
      i++;
      j++;
    } else if (melhor[i][j] === melhor[i + 1][j]) {
      pares.push({ ia: i++, familia: null, similaridade: 0 });
    } else {
      pares.push({ ia: null, familia: j++, similaridade: 0 });
    }
  }
  while (i < n) pares.push({ ia: i++, familia: null, similaridade: 0 });
  while (j < m) pares.push({ ia: null, familia: j++, similaridade: 0 });
  return pares;
}

function contarDiferenca(
  a: string,
  b: string,
): { adicionadas: number; removidas: number } {
  const contagem = new Map<string, number>();
  for (const t of tokens(a)) contagem.set(t, (contagem.get(t) ?? 0) + 1);
  let adicionadas = 0;
  for (const t of tokens(b)) {
    const c = contagem.get(t) ?? 0;
    if (c > 0) contagem.set(t, c - 1);
    else adicionadas++;
  }
  const removidas = [...contagem.values()].reduce((s, c) => s + c, 0);
  return { adicionadas, removidas };
}

export type Comparacao = {
  pares: (Par & {
    textoIa: string;
    textoFamilia: string;
    mudou: boolean;
    tinhaConfira: boolean;
  })[];
  paragrafosIa: number;
  paragrafosAlterados: number;
  percentualAlterado: number;
  palavrasAdicionadas: number;
  palavrasRemovidas: number;
};

export function comparar(
  ia: string[],
  familia: string[],
  marcacoes: Marcacao[],
): Comparacao {
  const pares = alinharParagrafos(ia, familia).map((p) => {
    const textoIa = p.ia === null ? "" : ia[p.ia];
    const textoFamilia = p.familia === null ? "" : familia[p.familia];
    return {
      ...p,
      textoIa,
      textoFamilia,
      mudou: tokens(textoIa).join(" ") !== tokens(textoFamilia).join(" "),
      tinhaConfira:
        p.ia !== null && marcacoes.some((m) => m.paragrafo === p.ia! + 1),
    };
  });
  let adicionadas = 0;
  let removidas = 0;
  for (const p of pares) {
    const d = contarDiferenca(p.textoIa, p.textoFamilia);
    adicionadas += d.adicionadas;
    removidas += d.removidas;
  }
  const alterados = pares.filter((p) => p.ia !== null && p.mudou).length;
  return {
    pares,
    paragrafosIa: ia.length,
    paragrafosAlterados: alterados,
    percentualAlterado: ia.length ? alterados / ia.length : 0,
    palavrasAdicionadas: adicionadas,
    palavrasRemovidas: removidas,
  };
}

export async function classificarEdicoes(
  ia: ClienteIA,
  ler: LeitorPrompt,
  c: Comparacao,
  segmentos: Segmento[],
): Promise<RespostaIA<ClassificacaoEdicoes>> {
  const mudados = c.pares.filter((p) => p.mudou);
  const texto = mudados
    .map(
      (p, i) =>
        `[${i + 1}]\nIA: ${p.textoIa || "(não existia)"}\nFAMÍLIA: ${p.textoFamilia || "(removido)"}`,
    )
    .join("\n\n");
  return ia.gerar({
    etapa: "classificar",
    modelo: MODELO_RAPIDO,
    maxTokens: 16000,
    esforco: "low",
    sistemaFixo: montarPrompt(ler, "classificar-edicao"),
    usuario: montarPrompt(ler, "classificar-edicao-entrada", {
      pares: texto,
      segmentos: formatarSegmentos(segmentos),
    }),
    schema: ClassificacaoEdicoes,
    validar: (r) => {
      const fora = r.mudancas.find(
        (m) => m.paragrafo < 1 || m.paragrafo > mudados.length,
      );
      return fora ? `par ${fora.paragrafo} não existe` : null;
    },
  });
}

/** Invenção que a família removeu de um parágrafo SEM "Confira": é o escape que importa. */
export function escapes(c: Comparacao, cl: ClassificacaoEdicoes) {
  const mudados = c.pares.filter((p) => p.mudou);
  return cl.mudancas.filter(
    (m) =>
      m.categoria === "invencao_removida" &&
      !mudados[m.paragrafo - 1]?.tinhaConfira,
  );
}
