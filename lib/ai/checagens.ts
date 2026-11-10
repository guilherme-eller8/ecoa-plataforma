// Checagens sem IA: determinísticas, custo zero, mesma resposta a cada rodada.
// Complementam o verificador; cada marcação vira um "Confira" com origem "checagem".
import type { Marcacao, TipoAfirmacao } from "./schemas";

// ── Normalização que preserva posições (1 caractere → 1 caractere) ────────

export function normalizar(texto: string): string {
  return Array.from(texto.normalize("NFC"))
    .map((c) => c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase() || c)
    .join("");
}

// ── Listas mantidas em .md (seções "## nome" com itens "- item") ─────────

export function lerSecao(md: string, secao: string): string[] {
  const linhas = md.split("\n");
  const alvo = normalizar(secao);
  let dentro = false;
  const itens: string[] = [];
  for (const linha of linhas) {
    const titulo = linha.match(/^##\s+(.+)$/);
    if (titulo) {
      dentro = normalizar(titulo[1]).startsWith(alvo);
      continue;
    }
    const item = linha.match(/^\s*-\s+(.+?)\s*$/);
    if (dentro && item) itens.push(item[1]);
  }
  return itens;
}

/**
 * Item de lista → regex. "/x/" é regex; "palavra*" casa o começo da palavra.
 * Tudo roda sobre o texto normalizado (minúsculo e sem acento): escreva regex assim.
 */
export function padraoDoItem(item: string): RegExp {
  const regex = item.match(/^\/(.+)\/([a-z]*)$/);
  if (regex)
    return new RegExp(
      regex[1],
      regex[2].includes("g") ? regex[2] : regex[2] + "g",
    );
  const prefixo = item.endsWith("*");
  const base = normalizar(prefixo ? item.slice(0, -1) : item).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const fim = prefixo ? "[\\p{L}]*" : "";
  return new RegExp(`(?<![\\p{L}])${base}${fim}(?![\\p{L}])`, "gu");
}

function ocorrencias(
  texto: string,
  padrao: RegExp,
): { inicio: number; fim: number }[] {
  const alvo = normalizar(texto);
  const achados: { inicio: number; fim: number }[] = [];
  for (const m of alvo.matchAll(padrao)) {
    achados.push({ inicio: m.index, fim: m.index + m[0].length });
  }
  return achados;
}

// ── Números (dígitos e por extenso) ──────────────────────────────────────

const UNIDADES: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  quatrocentos: 400,
  quinhentos: 500,
  seiscentos: 600,
  setecentos: 700,
  oitocentos: 800,
  novecentos: 900,
};

export type NumeroAchado = { valor: number; inicio: number; fim: number };

export function extrairNumeros(texto: string): NumeroAchado[] {
  const norm = normalizar(texto);
  const achados: NumeroAchado[] = [];

  for (const m of norm.matchAll(/\d+(?:[.,]\d+)*/g)) {
    achados.push({
      valor: Number(m[0].replace(/[.,]/g, "")),
      inicio: m.index,
      fim: m.index + m[0].length,
    });
  }

  // Sequências por extenso: "mil novecentos e cinquenta e oito" = 1958.
  const palavras = [...norm.matchAll(/\p{L}+/gu)];
  let i = 0;
  while (i < palavras.length) {
    const p = palavras[i][0];
    if (!(p in UNIDADES) && p !== "mil") {
      i++;
      continue;
    }
    let total = 0;
    let atual = 0;
    let fim = i;
    let j = i;
    let tokens = 0;
    while (j < palavras.length) {
      const w = palavras[j][0];
      if (w in UNIDADES) {
        atual += UNIDADES[w];
        tokens++;
        fim = j;
      } else if (w === "mil") {
        total += (atual || 1) * 1000;
        atual = 0;
        tokens++;
        fim = j;
      } else if (
        w === "e" &&
        j + 1 < palavras.length &&
        palavras[j + 1][0] in UNIDADES
      ) {
        // conector dentro do número
      } else break;
      j++;
    }
    const valor = total + atual;
    const sozinhoArtigo = tokens === 1 && (p === "um" || p === "uma");
    if (!sozinhoArtigo) {
      achados.push({
        valor,
        inicio: palavras[i].index,
        fim: palavras[fim].index + palavras[fim][0].length,
      });
    }
    i = fim + 1;
  }
  return achados;
}

// ── Checagens ────────────────────────────────────────────────────────────

export type ListasChecagem = {
  causa: string[];
  emocao: string[];
  antiSlop: string[];
};

export function checarParagrafo(
  numero: number,
  texto: string,
  textoFontes: string,
  listas: ListasChecagem,
): Marcacao[] {
  const marcas: Marcacao[] = [];
  const fontesNorm = normalizar(textoFontes);

  const conectores: [string[], TipoAfirmacao, string][] = [
    [listas.causa, "causa", "ligação de causa que não aparece no áudio"],
    [listas.emocao, "emocao", "emoção que não aparece no áudio"],
  ];
  for (const [itens, tipo, motivo] of conectores) {
    for (const item of itens) {
      const padrao = padraoDoItem(item);
      if (padrao.test(fontesNorm)) continue;
      padrao.lastIndex = 0;
      for (const o of ocorrencias(texto, padrao)) {
        marcas.push({
          paragrafo: numero,
          ...o,
          trecho: texto.slice(o.inicio, o.fim),
          tipo,
          origem: "checagem",
          motivo: `${motivo} ("${item}")`,
        });
      }
    }
  }

  const valoresFontes = new Set(
    extrairNumeros(textoFontes).map((n) => n.valor),
  );
  for (const n of extrairNumeros(texto)) {
    if (valoresFontes.has(n.valor)) continue;
    const ano = n.valor >= 1900 && n.valor <= 2100;
    marcas.push({
      paragrafo: numero,
      inicio: n.inicio,
      fim: n.fim,
      trecho: texto.slice(n.inicio, n.fim),
      tipo: ano ? "data" : "numero",
      origem: "checagem",
      motivo: `${ano ? "ano" : "número"} que não aparece no áudio`,
    });
  }

  for (const item of listas.antiSlop) {
    for (const o of ocorrencias(texto, padraoDoItem(item))) {
      marcas.push({
        paragrafo: numero,
        ...o,
        trecho: texto.slice(o.inicio, o.fim),
        tipo: "slop",
        origem: "checagem",
        motivo: `expressão de texto de IA ("${item}")`,
      });
    }
  }

  return marcas;
}

/** Acha um trecho citado pelo verificador dentro do parágrafo (exato, depois sem acento/caixa). */
export function localizarTrecho(
  paragrafo: string,
  trecho: string,
): { inicio: number; fim: number } | null {
  const exato = paragrafo.indexOf(trecho);
  if (exato >= 0) return { inicio: exato, fim: exato + trecho.length };
  const limpo = trecho.trim().replace(/^["'“”]+|["'“”.]+$/g, "");
  const i = normalizar(paragrafo).indexOf(normalizar(limpo));
  if (i >= 0 && limpo.length > 0) return { inicio: i, fim: i + limpo.length };
  return null;
}
