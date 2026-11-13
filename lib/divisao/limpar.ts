// Limpa a proposta de divisão da IA (prompt 7, design 6.3). Pura: recebe a saída do modelo e
// os segmentos do contêiner, devolve histórias em que cada segmento tem exatamente um dono.
// Nada some sem a pessoa ver: segmento esquecido pela IA vai para a história vizinha.
import type { Divisao, Segmento } from "@/lib/ai/schemas";

export type Faixa = [number, number];

/** Uma história proposta, como fica guardada em stories.divisao.ia. */
export type HistoriaProposta = {
  titulo: string | null;
  segmentos: Faixa[]; // faixas de ids, em ordem
  promptId: string | null; // pergunta escolhida no envio (definitiva)
  sugeridaId: string | null; // pergunta pendente que ela parece responder
};

export type Proposta = { historias: HistoriaProposta[] };

/** Pergunta que a IA viu na lista (P1, P2…), na mesma ordem. */
export type PerguntaCandidata = {
  id: string;
  /** Rótulos das gravações em que ela foi escolhida no envio ("g2"). Vazio = pendente. */
  ligadaA: string[];
};

export function falaDe(ids: number[], porId: Map<number, Segmento>): number {
  return ids.reduce((t, id) => {
    const s = porId.get(id);
    return t + (s ? Math.max(0, s.fim - s.inicio) : 0);
  }, 0);
}

/** Ids em ordem viram faixas de números seguidos. */
export function comprimir(ids: number[]): Faixa[] {
  const ordenados = [...new Set(ids)].sort((a, b) => a - b);
  const faixas: Faixa[] = [];
  for (const id of ordenados) {
    const ultima = faixas.at(-1);
    if (ultima && id === ultima[1] + 1) ultima[1] = id;
    else faixas.push([id, id]);
  }
  return faixas;
}

export function expandir(faixas: Faixa[]): number[] {
  const ids: number[] = [];
  for (const [de, ate] of faixas)
    for (let id = Math.min(de, ate); id <= Math.max(de, ate); id++)
      ids.push(id);
  return ids;
}

type Interna = {
  titulo: string | null;
  ids: number[];
  pergunta: number | null; // índice na lista (1…n)
};

export function limparDivisao(
  divisao: Divisao,
  ctx: {
    segmentos: Segmento[]; // do contêiner, em ordem de id
    perguntas: PerguntaCandidata[];
    minFalaS: number;
    maxHistorias: number;
  },
): Proposta {
  const segs = [...ctx.segmentos].sort((a, b) => a.id - b.id);
  if (segs.length === 0) return { historias: [] };
  const porId = new Map(segs.map((s) => [s.id, s]));
  const propostas = divisao.historias.length
    ? divisao.historias
    : [{ titulo: "", trechos: [], pergunta: null }];

  // 1. Dono de cada segmento: a 1ª história que o pede.
  const dono = new Map<number, number>();
  propostas.forEach((h, i) => {
    for (const t of h.trechos)
      for (const id of expandir([[t.de, t.ate]]))
        if (porId.has(id) && !dono.has(id)) dono.set(id, i);
  });

  // 2. Sem dono: vai para a história do segmento anterior (ou do seguinte, no começo).
  if (dono.size === 0) dono.set(segs[0].id, 0);
  let anterior: number | null = null;
  const semDono: number[] = [];
  for (const s of segs) {
    const d = dono.get(s.id);
    if (d === undefined) {
      if (anterior === null) semDono.push(s.id);
      else dono.set(s.id, anterior);
    } else {
      anterior = d;
      for (const id of semDono.splice(0)) dono.set(id, d);
    }
  }

  // 3. Monta, tira as vazias e ordena pelo 1º segmento.
  let lista: Interna[] = propostas
    .map((h, i) => ({
      titulo: h.titulo.trim().slice(0, 200) || null,
      ids: segs.filter((s) => dono.get(s.id) === i).map((s) => s.id),
      pergunta: h.pergunta,
    }))
    .filter((h) => h.ids.length > 0)
    .sort((a, b) => a.ids[0] - b.ids[0]);

  // 4. História curta demais junta com a vizinha (a anterior; a 1ª, com a seguinte).
  const juntar = (a: Interna, b: Interna): Interna => ({
    titulo: a.titulo ?? b.titulo,
    ids: [...a.ids, ...b.ids].sort((x, y) => x - y),
    pergunta: a.pergunta ?? b.pergunta,
  });
  for (;;) {
    if (lista.length < 2) break;
    const i = lista.findIndex((h) => falaDe(h.ids, porId) < ctx.minFalaS);
    if (i < 0) break;
    if (i === 0) lista = [juntar(lista[1], lista[0]), ...lista.slice(2)];
    else
      lista = [
        ...lista.slice(0, i - 1),
        juntar(lista[i - 1], lista[i]),
        ...lista.slice(i + 1),
      ];
  }

  // 5. Acima do teto, o excesso entra na última que cabe.
  if (lista.length > ctx.maxHistorias) {
    const resto = lista.slice(ctx.maxHistorias - 1).reduce(juntar);
    lista = [...lista.slice(0, ctx.maxHistorias - 1), resto];
  }

  // 6. Perguntas: a ligada no envio é definitiva; a pendente é sugestão. Cada uma uma vez só.
  const usadas = new Set<string>();
  const historias: HistoriaProposta[] = lista.map((h) => {
    const c =
      h.pergunta != null && h.pergunta >= 1
        ? ctx.perguntas[h.pergunta - 1]
        : undefined;
    const livre = c && !usadas.has(c.id) ? c : undefined;
    if (livre) usadas.add(livre.id);
    return {
      titulo: h.titulo,
      segmentos: comprimir(h.ids),
      promptId: livre && livre.ligadaA.length ? livre.id : null,
      sugeridaId: livre && !livre.ligadaA.length ? livre.id : null,
    };
  });

  // Pergunta ligada que ninguém pegou: a história com mais segmentos daquela gravação.
  for (const c of ctx.perguntas) {
    if (!c.ligadaA.length || usadas.has(c.id)) continue;
    let melhor = -1;
    let maior = 0;
    historias.forEach((h, i) => {
      if (h.promptId) return;
      const n = expandir(h.segmentos).filter((id) =>
        c.ligadaA.includes(porId.get(id)?.arquivo ?? ""),
      ).length;
      if (n > maior) [melhor, maior] = [i, n];
    });
    if (melhor >= 0) {
      historias[melhor] = {
        ...historias[melhor],
        promptId: c.id,
        sugeridaId: null,
      };
      usadas.add(c.id);
    }
  }
  return { historias };
}
