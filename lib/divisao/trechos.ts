// Tela "Confira as histórias" (prompt 7, design seção 7): trechos de ~1 min e as ações de
// 1 toque. Puro e sem dependências: roda no navegador e nos testes. Nada aqui fala com o
// servidor; a carga do confirmar sai de `cargaDoConfirmar`.
import { expandir, type Faixa } from "./limpar";

/** Segmento como a tela recebe (sem palavras): id, gravação, tempo e texto. */
export type SegmentoTela = {
  id: number;
  gravacao: string; // id da gravação
  parte: number; // ordem da gravação no contêiner (1, 2…)
  inicio: number; // segundos
  fim: number;
  texto: string;
};

export type Trecho = {
  chave: string; // `${primeiro id}`: estável entre renderizações
  gravacao: string;
  parte: number;
  inicio: number;
  fim: number;
  ids: number[];
  texto: string;
};

export type HistoriaTela = {
  chave: string;
  titulo: string | null;
  trechos: Trecho[];
  promptId: string | null;
  sugeridaId: string | null;
  ignorada: boolean;
};

const PAUSA_BOA_S = 2;

/**
 * Corta os segmentos de uma história em trechos de cerca de `alvoS` segundos. Só corta entre
 * segmentos (que já terminam em pausa ou fim de frase) e nunca junta gravações diferentes.
 * Passado 60% do alvo, uma pausa de 2 s já é um bom lugar para cortar.
 */
export function cortarTrechos(segs: SegmentoTela[], alvoS: number): Trecho[] {
  const ordenados = [...segs].sort((a, b) => a.id - b.id);
  const trechos: Trecho[] = [];
  let atual: SegmentoTela[] = [];
  const fechar = () => {
    if (!atual.length) return;
    const p = atual[0];
    trechos.push({
      chave: String(p.id),
      gravacao: p.gravacao,
      parte: p.parte,
      inicio: p.inicio,
      fim: atual.at(-1)!.fim,
      ids: atual.map((s) => s.id),
      texto: atual.map((s) => s.texto).join(" "),
    });
    atual = [];
  };
  ordenados.forEach((s, i) => {
    const ultimo = atual.at(-1);
    if (ultimo && (s.gravacao !== ultimo.gravacao || s.id !== ultimo.id + 1))
      fechar();
    atual.push(s);
    const dur = s.fim - atual[0].inicio;
    const prox = ordenados[i + 1];
    const pausa = prox && prox.gravacao === s.gravacao ? prox.inicio - s.fim : 0;
    if (dur >= alvoS || (dur >= alvoS * 0.6 && pausa >= PAUSA_BOA_S)) fechar();
  });
  fechar();
  return trechos;
}

/** A proposta guardada (faixas de ids) vira a lista da tela. */
export function montar(
  historias: {
    titulo: string | null;
    segmentos: Faixa[];
    promptId: string | null;
    sugeridaId: string | null;
  }[],
  segs: SegmentoTela[],
  alvoS: number,
): HistoriaTela[] {
  const porId = new Map(segs.map((s) => [s.id, s]));
  return historias
    .map((h) => {
      const meus = expandir(h.segmentos).flatMap((id) => {
        const s = porId.get(id);
        return s ? [s] : [];
      });
      return {
        chave: String(meus[0]?.id ?? 0),
        titulo: h.titulo,
        trechos: cortarTrechos(meus, alvoS),
        promptId: h.promptId,
        sugeridaId: h.sugeridaId,
        ignorada: false,
      };
    })
    .filter((h) => h.trechos.length > 0);
}

const primeiro = (h: HistoriaTela) => h.trechos[0]?.ids[0] ?? 0;

/** Junta a história `i` com a de baixo. Fica o título da de cima (ou o da de baixo). */
export function juntar(lista: HistoriaTela[], i: number): HistoriaTela[] {
  const a = lista[i];
  const b = lista[i + 1];
  if (!a || !b) return lista;
  const junta: HistoriaTela = {
    chave: a.chave,
    titulo: a.titulo ?? b.titulo,
    trechos: [...a.trechos, ...b.trechos].sort(
      (x, y) => x.ids[0] - y.ids[0],
    ),
    promptId: a.promptId ?? b.promptId,
    sugeridaId: a.promptId || b.promptId ? null : (a.sugeridaId ?? b.sugeridaId),
    ignorada: a.ignorada && b.ignorada,
  };
  return [...lista.slice(0, i), junta, ...lista.slice(i + 2)];
}

/** Separa a história `i` antes do trecho `k`: a nova começa sem título e sem pergunta. */
export function separar(
  lista: HistoriaTela[],
  i: number,
  k: number,
): HistoriaTela[] {
  const h = lista[i];
  if (!h || k <= 0 || k >= h.trechos.length) return lista;
  const nova: HistoriaTela = {
    chave: h.trechos[k].chave,
    titulo: null,
    trechos: h.trechos.slice(k),
    promptId: null,
    sugeridaId: null,
    ignorada: false,
  };
  return [
    ...lista.slice(0, i),
    { ...h, trechos: h.trechos.slice(0, k) },
    nova,
    ...lista.slice(i + 1),
  ];
}

/** Tira o trecho `k` da história `i`. A história que fica sem trecho sai da lista. */
export function tirar(
  lista: HistoriaTela[],
  i: number,
  k: number,
): HistoriaTela[] {
  const h = lista[i];
  if (!h || !h.trechos[k]) return lista;
  const trechos = h.trechos.filter((_, j) => j !== k);
  return trechos.length
    ? lista.map((x, j) => (j === i ? { ...x, trechos } : x))
    : lista.filter((_, j) => j !== i);
}

export function renomear(
  lista: HistoriaTela[],
  i: number,
  titulo: string,
): HistoriaTela[] {
  const limpo = titulo.trim().slice(0, 200);
  return lista.map((x, j) => (j === i ? { ...x, titulo: limpo || null } : x));
}

export function responderSugestao(
  lista: HistoriaTela[],
  i: number,
  aceitar: boolean,
): HistoriaTela[] {
  return lista.map((x, j) =>
    j !== i || !x.sugeridaId
      ? x
      : aceitar
        ? { ...x, promptId: x.sugeridaId, sugeridaId: null }
        : { ...x, sugeridaId: null, ignorada: true },
  );
}

export function duracaoS(h: HistoriaTela): number {
  return h.trechos.reduce((t, x) => t + (x.fim - x.inicio), 0);
}

/** O que vai para `confirmar_divisao`, na ordem da tela (ordenada pelo 1º segmento). */
export function cargaDoConfirmar(lista: HistoriaTela[]) {
  return [...lista]
    .sort((a, b) => primeiro(a) - primeiro(b))
    .map((h) => ({
      titulo: h.titulo,
      segmentos: h.trechos.flatMap((t) => t.ids).sort((a, b) => a - b),
      prompt_id: h.promptId,
      sugerida: h.sugeridaId,
      ignorada: h.ignorada,
    }));
}

/** Primeiras palavras de um trecho, para a lista. */
export function inicioDoTexto(texto: string, palavras = 14): string {
  const p = texto.split(/\s+/).filter(Boolean);
  return p.length > palavras ? `${p.slice(0, palavras).join(" ")}…` : p.join(" ");
}

/** "12:30" a partir de segundos. */
export function relogio(s: number): string {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const seg = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${seg}` : `${m}:${seg}`;
}
