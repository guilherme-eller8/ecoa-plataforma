// Texto da história no editor (prompt 8): o formato salvo no banco e a ida e volta com o
// documento do Tiptap. Sem dependência do Tiptap: só JSON, para testar sem navegador.
// Formato salvo: {titulo, ano?, paragrafos: [{id, texto, fontes, editado}], lacunas}.
import type { Marcacao, TipoAfirmacao } from "@/lib/ai/schemas";

export type Paragrafo = {
  id: string;
  texto: string;
  fontes: number[];
  editado: boolean;
};

export type TextoDaHistoria = {
  titulo: string;
  ano: number | null;
  paragrafos: Paragrafo[];
  lacunas: { pergunta: string; motivo: string }[];
};

const ID_PARAGRAFO = /^[a-z0-9-]{1,40}$/;

/** Id novo de parágrafo (só letras minúsculas e números, como o banco aceita). */
export function novoId(): string {
  return "p-" + Math.random().toString(36).slice(2, 10);
}

function inteiros(x: unknown): number[] {
  return Array.isArray(x)
    ? x.filter((n): n is number => Number.isInteger(n) && n >= 0)
    : [];
}

/**
 * Lê o que veio do banco (versão da IA, sem id nem "editado", ou texto já salvo) no formato
 * do editor. Ids repetidos ou fora do padrão ganham id novo, determinístico pela posição.
 */
export function normalizarTexto(conteudo: unknown): TextoDaHistoria {
  const c = (conteudo ?? {}) as Record<string, unknown>;
  const vistos = new Set<string>();
  const brutos = Array.isArray(c.paragrafos) ? c.paragrafos : [];
  const paragrafos = brutos.map((p, i): Paragrafo => {
    const x = (p ?? {}) as Record<string, unknown>;
    let id = typeof x.id === "string" && ID_PARAGRAFO.test(x.id) ? x.id : "";
    if (!id || vistos.has(id)) id = `p${i + 1}`;
    while (vistos.has(id)) id = `${id}-${i + 1}`;
    vistos.add(id);
    return {
      id,
      texto: typeof x.texto === "string" ? x.texto : "",
      fontes: inteiros(x.fontes),
      editado: x.editado === true,
    };
  });
  const ano =
    typeof c.ano === "number" && Number.isInteger(c.ano) ? c.ano : null;
  const lacunas = Array.isArray(c.lacunas)
    ? (c.lacunas as { pergunta?: unknown; motivo?: unknown }[]).flatMap((l) =>
        typeof l?.pergunta === "string"
          ? [{ pergunta: l.pergunta, motivo: String(l.motivo ?? "") }]
          : [],
      )
    : [];
  return {
    titulo: typeof c.titulo === "string" ? c.titulo : "",
    ano,
    paragrafos: paragrafos.length
      ? paragrafos
      : [{ id: "p1", texto: "", fontes: [], editado: false }],
    lacunas,
  };
}

// ── Documento do Tiptap (JSON do ProseMirror) ─────────────────────────────

export type AtributosConfira = {
  id: string;
  tipo: TipoAfirmacao | "slop";
  origem: "checagem" | "verificador";
  motivo: string;
  trecho: string;
};

type NoTexto = {
  type: "text";
  text: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};
export type NoParagrafo = {
  type: "paragraph";
  attrs?: { pid?: string | null; fontes?: number[]; editado?: boolean };
  content?: NoTexto[];
};
export type DocTiptap = { type: "doc"; content: NoParagrafo[] };

/** Divide o parágrafo em trechos normais e grifados, sem sobrepor grifos. */
export function trechosDoParagrafo(texto: string, marcas: Marcacao[]) {
  const ordenadas = [...marcas].sort((a, b) => a.inicio - b.inicio);
  const partes: { texto: string; marca: Marcacao | null }[] = [];
  let pos = 0;
  for (const m of ordenadas) {
    const inicio = Math.max(m.inicio, pos);
    const fim = Math.min(m.fim, texto.length);
    if (fim <= inicio) continue;
    if (inicio > pos)
      partes.push({ texto: texto.slice(pos, inicio), marca: null });
    partes.push({ texto: texto.slice(inicio, fim), marca: m });
    pos = fim;
  }
  if (pos < texto.length) partes.push({ texto: texto.slice(pos), marca: null });
  return partes;
}

/** Texto + grifos → documento do Tiptap. */
export function paraDocumento(
  texto: TextoDaHistoria,
  marcacoes: Marcacao[],
): DocTiptap {
  let n = 0;
  return {
    type: "doc",
    content: texto.paragrafos.map((p, i) => {
      const partes = trechosDoParagrafo(
        p.texto,
        marcacoes.filter((m) => m.paragrafo === i + 1),
      );
      return {
        type: "paragraph",
        attrs: { pid: p.id, fontes: p.fontes, editado: p.editado },
        content: partes.map((t): NoTexto => {
          if (!t.marca) return { type: "text", text: t.texto };
          const attrs: AtributosConfira = {
            id: `c${++n}`,
            tipo: t.marca.tipo,
            origem: t.marca.origem,
            motivo: t.marca.motivo,
            trecho: t.texto,
          };
          return {
            type: "text",
            text: t.texto,
            marks: [{ type: "confira", attrs }],
          };
        }),
      };
    }),
  };
}

/**
 * Documento do Tiptap → texto salvo e grifos com a posição recalculada. `originais` é o texto
 * de cada parágrafo quando a tela abriu: mudou, fica `editado` (base do travamento, prompt 9).
 * Parágrafos vazios saem (sobra pelo menos 1).
 */
export function doDocumento(
  doc: DocTiptap,
  base: Pick<TextoDaHistoria, "titulo" | "ano" | "lacunas">,
  originais: Map<string, string>,
): { texto: TextoDaHistoria; marcacoes: Marcacao[] } {
  const paragrafos: Paragrafo[] = [];
  const marcacoes: Marcacao[] = [];
  const vistos = new Set<string>();
  for (const no of doc.content ?? []) {
    if (no.type !== "paragraph") continue;
    let texto = "";
    const grifos: Marcacao[] = [];
    for (const t of no.content ?? []) {
      if (t.type !== "text") continue;
      const m = t.marks?.find((x) => x.type === "confira");
      if (m) {
        const a = m.attrs as unknown as AtributosConfira;
        const anterior = grifos.at(-1);
        // Pedaços vizinhos do mesmo grifo (o Tiptap divide ao mudar outra marca) viram um só.
        if (
          anterior &&
          anterior.fim === texto.length &&
          a.trecho === anterior.trecho
        )
          anterior.fim += t.text.length;
        else
          grifos.push({
            paragrafo: 0,
            inicio: texto.length,
            fim: texto.length + t.text.length,
            trecho: a.trecho,
            tipo: a.tipo,
            origem: a.origem,
            motivo: a.motivo,
          });
      }
      texto += t.text;
    }
    if (!texto.trim()) continue;
    let id = no.attrs?.pid ?? "";
    if (!ID_PARAGRAFO.test(id) || vistos.has(id)) id = novoId();
    vistos.add(id);
    const original = originais.get(id);
    paragrafos.push({
      id,
      texto,
      fontes: inteiros(no.attrs?.fontes),
      editado: Boolean(no.attrs?.editado) || original !== texto,
    });
    for (const g of grifos)
      marcacoes.push({
        ...g,
        paragrafo: paragrafos.length,
        trecho: texto.slice(g.inicio, g.fim),
      });
  }
  return {
    texto: {
      titulo: base.titulo,
      ano: base.ano,
      lacunas: base.lacunas,
      paragrafos: paragrafos.length
        ? paragrafos
        : [{ id: novoId(), texto: "", fontes: [], editado: true }],
    },
    marcacoes,
  };
}

/** Formato que vai ao banco (sem `ano` quando vazio). */
export function paraSalvar(texto: TextoDaHistoria) {
  return {
    titulo: texto.titulo.trim().slice(0, 200),
    ...(texto.ano != null ? { ano: texto.ano } : {}),
    paragrafos: texto.paragrafos,
    lacunas: texto.lacunas,
  };
}

/** Ano digitado: 4 algarismos entre 1850 e 2100, ou nada. */
export function lerAno(valor: string): number | null | "invalido" {
  const v = valor.trim();
  if (!v) return null;
  if (!/^\d{4}$/.test(v)) return "invalido";
  const n = Number(v);
  return n >= 1850 && n <= 2100 ? n : "invalido";
}
