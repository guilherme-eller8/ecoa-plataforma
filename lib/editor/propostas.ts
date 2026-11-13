// Propostas da IA (prompt 9): montar as mudanças de cada ferramenta, compor o texto final de um
// aceite (tudo ou em parte) e a diferença por palavra. Puro: a tela usa para a prévia e o
// servidor para o aceite; o banco confere o resultado (aplicar_proposta).
// Design: docs/designs/ia-sob-controle.md, seção 4.
import type { Marcacao } from "@/lib/ai/schemas";
import { novoId, type Paragrafo } from "./conteudo";

export type TipoProposta = "tamanho" | "trecho" | "audio";
export type EstadoProposta =
  "gerando" | "pronta" | "aplicada" | "descartada" | "falhou";

/** Parágrafo que a mudança tira, com o texto da hora em que a proposta foi feita. */
export type Tirado = { id: string; texto: string };

export type Mudanca = {
  id: string; // m1, m2...
  tira: Tirado[];
  poe: Paragrafo[];
  depois_de: string | null; // só quando tira é vazio
};

/** Grifo de um parágrafo novo, guardado pelo id dele (não pela posição). */
export type MarcacaoProposta = Omit<Marcacao, "paragrafo"> & {
  paragrafo_id: string;
};

export type Proposta = {
  id: string;
  tipo: TipoProposta;
  mudancas: Mudanca[];
  ordem: string[] | null; // tamanho: o texto inteiro proposto ("Aceitar tudo")
  marcacoes: MarcacaoProposta[];
  pedido: { paragrafo?: string } & Record<string, unknown>;
};

type Novo = { texto: string; fontes: number[] };
type GerarId = () => string;

const minFonte = (fontes: number[]) =>
  fontes.length ? Math.min(...fontes) : Number.POSITIVE_INFINITY;

const tirado = (p: Paragrafo): Tirado => ({ id: p.id, texto: p.texto });

// ── Tamanho ──────────────────────────────────────────────────────────────

/** Item da edição com travados: texto novo ou o marcador de um parágrafo travado. */
export type ItemTamanho = Novo | { travado: string };

/**
 * Mudanças de uma troca de tamanho. A IA devolve o texto inteiro com marcadores no lugar dos
 * travados; o texto travado nunca vem da IA (é sempre o do parágrafo atual). Travado esquecido
 * volta pela ordem das fontes. Parágrafos antigos e novos que contam os mesmos segmentos viram
 * uma mudança; novo sem par = inserção; antigo sem par = remoção.
 */
export function mudancasDeTamanho(
  atual: Paragrafo[],
  itens: ItemTamanho[],
  gerarId: GerarId = novoId,
): { mudancas: Mudanca[]; ordem: string[] } {
  const travados = atual.filter((p) => p.editado);
  const idsTravados = new Set(travados.map((p) => p.id));
  const fontesTravadas = new Set(travados.flatMap((p) => p.fontes));

  // Lista final: "t:<id>" para travado, ou o parágrafo novo.
  type Slot =
    { travado: true; id: string } | { travado: false; par: Paragrafo };
  const lista: Slot[] = [];
  const vistos = new Set<string>();
  for (const item of itens) {
    if ("travado" in item) {
      if (idsTravados.has(item.travado) && !vistos.has(item.travado)) {
        vistos.add(item.travado);
        lista.push({ travado: true, id: item.travado });
      }
      continue;
    }
    if (!item.texto.trim()) continue;
    // Parágrafo novo que só reconta um travado (todas as fontes dele são de travados) duplicaria
    // o que a família escreveu: fica de fora.
    if (item.fontes.length && item.fontes.every((f) => fontesTravadas.has(f)))
      continue;
    lista.push({
      travado: false,
      par: {
        id: gerarId(),
        texto: item.texto,
        fontes: item.fontes,
        editado: false,
      },
    });
  }
  // Travado que a IA esqueceu: antes do 1º item cuja menor fonte vem depois da dele.
  for (const t of travados) {
    if (vistos.has(t.id)) continue;
    const alvo = minFonte(t.fontes);
    const i = lista.findIndex(
      (s) =>
        minFonte(s.travado ? porId(atual, s.id).fontes : s.par.fontes) > alvo,
    );
    lista.splice(i < 0 ? lista.length : i, 0, { travado: true, id: t.id });
    vistos.add(t.id);
  }
  // Os travados ficam na ordem em que estão no texto (o banco confere): os lugares são da IA.
  const ordemTravados = travados.map((t) => t.id);
  let k = 0;
  for (const s of lista) if (s.travado) s.id = ordemTravados[k++];

  // Grupos por fontes em comum (union-find entre antigos não travados e novos).
  const antigos = atual.filter((p) => !p.editado);
  const novos = lista.flatMap((s) => (s.travado ? [] : [s.par]));
  const pai = new Map<string, string>();
  const achar = (x: string): string => {
    const p = pai.get(x) ?? x;
    if (p === x) return x;
    const r = achar(p);
    pai.set(x, r);
    return r;
  };
  const unir = (a: string, b: string) => pai.set(achar(a), achar(b));
  for (const a of antigos) pai.set(`a:${a.id}`, `a:${a.id}`);
  for (const n of novos) pai.set(`n:${n.id}`, `n:${n.id}`);
  const quemTem = new Map<number, string[]>();
  for (const a of antigos)
    for (const f of a.fontes)
      quemTem.set(f, [...(quemTem.get(f) ?? []), `a:${a.id}`]);
  for (const n of novos)
    for (const f of n.fontes)
      for (const a of quemTem.get(f) ?? []) unir(`n:${n.id}`, a);

  const grupos = new Map<string, { tira: Paragrafo[]; poe: Paragrafo[] }>();
  const grupo = (no: string) => {
    const r = achar(no);
    if (!grupos.has(r)) grupos.set(r, { tira: [], poe: [] });
    return grupos.get(r)!;
  };
  for (const a of antigos) grupo(`a:${a.id}`).tira.push(a);
  for (const n of novos) grupo(`n:${n.id}`).poe.push(n);

  const ordem = lista.map((s) => (s.travado ? s.id : s.par.id));
  const posicao = (g: { tira: Paragrafo[]; poe: Paragrafo[] }) =>
    g.poe.length
      ? ordem.indexOf(g.poe[0].id)
      : ordem.length + atual.findIndex((p) => p.id === g.tira[0].id);
  const ordenados = [...grupos.values()].sort(
    (a, b) => posicao(a) - posicao(b),
  );
  const mudancas = ordenados.map((g, i): Mudanca => {
    const antes = g.poe.length
      ? ordem[ordem.indexOf(g.poe[0].id) - 1]
      : undefined;
    return {
      id: `m${i + 1}`,
      tira: g.tira.map(tirado),
      poe: g.poe,
      depois_de: g.tira.length ? null : (antes ?? null),
    };
  });
  return { mudancas, ordem };
}

function porId(lista: Paragrafo[], id: string): Paragrafo {
  return lista.find((p) => p.id === id)!;
}

// ── Acrescentar áudio ────────────────────────────────────────────────────

export type Operacao = {
  tipo: "inserir" | "substituir";
  alvo: string | null; // inserir: depois de qual (null = no começo); substituir: qual
  paragrafos: Novo[];
};

/** Só inserções e trocas de parágrafos não travados; o resto é descartado. */
export function mudancasDeAudio(
  atual: Paragrafo[],
  operacoes: Operacao[],
  gerarId: GerarId = novoId,
): Mudanca[] {
  const ids = new Set(atual.map((p) => p.id));
  const usados = new Set<string>();
  const mudancas: Mudanca[] = [];
  for (const op of operacoes) {
    const poe = op.paragrafos
      .filter((p) => p.texto.trim())
      .map((p) => ({
        id: gerarId(),
        texto: p.texto,
        fontes: p.fontes,
        editado: false,
      }));
    if (op.tipo === "substituir") {
      const alvo = atual.find((p) => p.id === op.alvo);
      if (!alvo || alvo.editado || usados.has(alvo.id) || !poe.length) continue;
      usados.add(alvo.id);
      mudancas.push({ id: "", tira: [tirado(alvo)], poe, depois_de: null });
    } else {
      if (!poe.length) continue;
      const depois =
        op.alvo && ids.has(op.alvo)
          ? op.alvo
          : op.alvo
            ? (atual.at(-1)?.id ?? null)
            : null;
      mudancas.push({ id: "", tira: [], poe, depois_de: depois });
    }
  }
  return mudancas.map((m, i) => ({ ...m, id: `m${i + 1}` }));
}

// ── Revisar trecho ───────────────────────────────────────────────────────

/** O parágrafo com o trecho [inicio, fim) (UTF-16) trocado pelo substituto; fica travado (P51). */
export function mudancaDeTrecho(
  alvo: Paragrafo,
  inicio: number,
  fim: number,
  substituto: string,
  gerarId: GerarId = novoId,
): Mudanca[] {
  const texto = (
    alvo.texto.slice(0, inicio) +
    substituto +
    alvo.texto.slice(fim)
  )
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!texto || texto === alvo.texto) return [];
  return [
    {
      id: "m1",
      tira: [tirado(alvo)],
      poe: [{ id: gerarId(), texto, fontes: alvo.fontes, editado: true }],
      depois_de: null,
    },
  ];
}

/** Posição em unidades UTF-16 (a tela) → pontos de código (char_length do banco). */
export function paraPontos(texto: string, utf16: number): number {
  return [...texto.slice(0, utf16)].length;
}

/** Pontos de código (banco) → unidades UTF-16 (JavaScript). */
export function paraUtf16(texto: string, pontos: number): number {
  return [...texto].slice(0, pontos).join("").length;
}

// ── Compor o texto final ─────────────────────────────────────────────────

/**
 * Mudanças que não podem mais ser aceitas: o que elas tiram mudou depois do pedido, sumiu, ou
 * passou a ser editado à mão (salvo o alvo de um "Revisar trecho").
 */
export function mudancasVencidas(atual: Paragrafo[], p: Proposta): Set<string> {
  const porIdAtual = new Map(atual.map((x) => [x.id, x]));
  const ids = new Set(atual.map((x) => x.id));
  const vencidas = new Set<string>();
  for (const m of p.mudancas) {
    const ruim = m.tira.some((t) => {
      const a = porIdAtual.get(t.id);
      if (!a || a.texto !== t.texto) return true;
      return a.editado && !(p.tipo === "trecho" && a.id === p.pedido.paragrafo);
    });
    // Id novo que já existe no texto (não deveria): também não entra.
    const colide = m.poe.some(
      (x) => ids.has(x.id) && !m.tira.some((t) => t.id === x.id),
    );
    if (ruim || colide) vencidas.add(m.id);
  }
  return vencidas;
}

/**
 * O texto final de um aceite e os grifos. Mudanças vencidas ficam de fora. Cada aceita entra no
 * lugar do 1º parágrafo que tira; inserção, depois da âncora (ou do que ficou antes dela).
 * Tudo aceito numa proposta de tamanho: a ordem da IA, com os parágrafos criados depois do
 * pedido no lugar deles.
 */
export function comporProposta(
  atual: Paragrafo[],
  marcacoesAtuais: Marcacao[],
  p: Proposta,
  aceitas: Iterable<string>,
): { paragrafos: Paragrafo[]; marcacoes: Marcacao[]; aplicadas: string[] } {
  const vencidas = mudancasVencidas(atual, p);
  const pedidas = new Set(aceitas);
  const efetivas = p.mudancas.filter(
    (m) => pedidas.has(m.id) && !vencidas.has(m.id),
  );
  const tiradas = new Set(efetivas.flatMap((m) => m.tira.map((t) => t.id)));
  const postos = new Map(
    efetivas.flatMap((m) => m.poe.map((x) => [x.id, x] as const)),
  );

  let resultado: Paragrafo[];
  const tudo = efetivas.length === p.mudancas.length && p.mudancas.length > 0;
  if (p.tipo === "tamanho" && p.ordem && tudo) {
    const atualPorId = new Map(atual.map((x) => [x.id, x]));
    resultado = p.ordem.flatMap((id) => {
      const x =
        postos.get(id) ?? (tiradas.has(id) ? undefined : atualPorId.get(id));
      return x ? [x] : [];
    });
    // Criados depois do pedido (não estão na ordem): depois do anterior que ficou.
    const presentes = new Set(resultado.map((x) => x.id));
    atual.forEach((x, i) => {
      if (tiradas.has(x.id) || presentes.has(x.id)) return;
      const antes = atual
        .slice(0, i)
        .reverse()
        .find((y) => presentes.has(y.id));
      const pos = antes ? resultado.findIndex((y) => y.id === antes.id) + 1 : 0;
      resultado.splice(pos, 0, x);
      presentes.add(x.id);
    });
  } else {
    const primeiro = new Map<string, Mudanca>();
    for (const m of efetivas) if (m.tira.length) primeiro.set(m.tira[0].id, m);
    resultado = [];
    for (const x of atual) {
      const m = primeiro.get(x.id);
      if (m) resultado.push(...m.poe);
      else if (!tiradas.has(x.id)) resultado.push(x);
    }
    // O que substituiu um parágrafo responde pela âncora dele.
    const trocado = new Map<string, string>();
    for (const m of efetivas)
      for (const t of m.tira)
        if (m.poe.length) trocado.set(t.id, m.poe.at(-1)!.id);
    // Parágrafo novo de uma mudança recusada responde pelo último que ela tiraria (que ficou).
    for (const m of p.mudancas)
      if (!efetivas.includes(m) && m.tira.length)
        for (const x of m.poe) trocado.set(x.id, m.tira.at(-1)!.id);
    const ordem = p.ordem ?? [];
    const ultimoDepoisDe = new Map<string | null, string>();
    for (const m of efetivas) {
      if (m.tira.length || !m.poe.length) continue;
      let ancora = m.depois_de;
      let pos = -1;
      while (ancora) {
        const id = trocado.get(ancora) ?? ancora;
        pos = resultado.findIndex((y) => y.id === id);
        if (pos >= 0) break;
        const i = ordem.indexOf(ancora);
        ancora = i > 0 ? ordem[i - 1] : null;
      }
      // Depois dos que já entraram com a mesma âncora (mantém a ordem da proposta).
      const chave = pos >= 0 ? resultado[pos].id : null;
      const ultimo = ultimoDepoisDe.get(chave);
      const onde = ultimo
        ? resultado.findIndex((y) => y.id === ultimo) + 1
        : pos + 1;
      resultado.splice(onde, 0, ...m.poe);
      ultimoDepoisDe.set(chave, m.poe.at(-1)!.id);
    }
  }

  // Grifos: os que ficam levam os seus; os novos, os da proposta.
  const marcacoes: Marcacao[] = [];
  resultado.forEach((x, i) => {
    if (postos.has(x.id)) {
      for (const m of p.marcacoes)
        if (m.paragrafo_id === x.id) {
          marcacoes.push({
            paragrafo: i + 1,
            inicio: m.inicio,
            fim: m.fim,
            trecho: m.trecho,
            tipo: m.tipo,
            origem: m.origem,
            motivo: m.motivo,
          });
        }
      return;
    }
    const antes = atual.findIndex((y) => y.id === x.id);
    for (const m of marcacoesAtuais)
      if (m.paragrafo === antes + 1) marcacoes.push({ ...m, paragrafo: i + 1 });
  });
  return {
    paragrafos: resultado,
    marcacoes,
    aplicadas: efetivas.map((m) => m.id),
  };
}

// ── Diferença por palavra ────────────────────────────────────────────────

export type PedacoDiferenca = {
  tipo: "igual" | "inserido" | "removido";
  texto: string;
};

const LIMITE_CELULAS = 4_000_000;

/** Diferença por palavra (inserido em verde, removido riscado na tela). */
export function diferencaPorPalavra(
  antes: string,
  depois: string,
): PedacoDiferenca[] {
  const a = antes.split(/(\s+)/).filter(Boolean);
  const b = depois.split(/(\s+)/).filter(Boolean);
  if (!a.length && !b.length) return [];
  if (a.length * b.length > LIMITE_CELULAS)
    return juntar([
      ...(antes ? [{ tipo: "removido" as const, texto: antes }] : []),
      ...(depois ? [{ tipo: "inserido" as const, texto: depois }] : []),
    ]);
  // Maior subsequência comum (tabela de trás para frente).
  const n = a.length;
  const m = b.length;
  const t: Uint32Array[] = Array.from(
    { length: n + 1 },
    () => new Uint32Array(m + 1),
  );
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      t[i][j] =
        a[i] === b[j]
          ? t[i + 1][j + 1] + 1
          : Math.max(t[i + 1][j], t[i][j + 1]);
  const pedacos: PedacoDiferenca[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pedacos.push({ tipo: "igual", texto: a[i] });
      i++;
      j++;
    } else if (t[i + 1][j] >= t[i][j + 1])
      pedacos.push({ tipo: "removido", texto: a[i++] });
    else pedacos.push({ tipo: "inserido", texto: b[j++] });
  }
  while (i < n) pedacos.push({ tipo: "removido", texto: a[i++] });
  while (j < m) pedacos.push({ tipo: "inserido", texto: b[j++] });
  return juntar(pedacos);
}

/** Junta pedaços vizinhos do mesmo tipo; espaço solto entre duas mudanças vai junto. */
function juntar(pedacos: PedacoDiferenca[]): PedacoDiferenca[] {
  const r: PedacoDiferenca[] = [];
  for (const p of pedacos) {
    const ultimo = r.at(-1);
    if (ultimo && ultimo.tipo === p.tipo) ultimo.texto += p.texto;
    else r.push({ ...p });
  }
  return r;
}
