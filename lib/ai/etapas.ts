// Etapas do pipeline para UMA história. Puro: recebe o cliente de IA e o leitor de prompts.
// O lab orquestra arquivos e relatório; a plataforma (prompt 6) orquestra fila e banco.
import { MODELO_CAPAZ, MODELO_RAPIDO, TAMANHOS_TEXTO } from "@/lib/config";
import { montarPrompt, type LeitorPrompt } from "./carregar-prompt";
import {
  checarParagrafo,
  lerSecao,
  localizarTrecho,
  type ListasChecagem,
} from "./checagens";
import type { ChamadaIA, ClienteIA, RespostaIA } from "./claude";
import {
  Divisao,
  Edicao,
  EdicaoComTravados,
  Estrutura,
  Integracao,
  Memoria,
  Revisao,
  Verificacao,
  idSegmento,
  nomesDoGlossario,
  type Glossario,
  type Marcacao,
  type Segmento,
} from "./schemas";
import { contarPalavras } from "./segmentar";

export type Tamanho = keyof typeof TAMANHOS_TEXTO;

export function formatarSegmentos(
  segmentos: Segmento[],
  estrutura?: Estrutura,
): string {
  const papel = new Map(estrutura?.falantes.map((f) => [f.falante, f.papel]));
  const vazios = new Set(estrutura?.vazios);
  return segmentos
    .map((s) => {
      const quem = papel.get(s.falante) ?? s.falante;
      const marca = vazios.has(s.id) ? " (vazio)" : "";
      return `${idSegmento(s.id)} [${quem}]${marca} ${s.texto}`;
    })
    .join("\n");
}

/**
 * Bloco do livro (com cache de prompt). `historias` = resumos das histórias já prontas
 * (memória do livro, prompt 6); no lab, nenhuma.
 */
export function contextoDoLivro(
  ler: LeitorPrompt,
  g: Glossario,
  historias = "(nenhuma ainda)",
): string {
  const linhas = [...g.pessoas, ...g.lugares].map((e) => {
    const extra = [
      e.relacao,
      e.apelidos.length ? `apelidos: ${e.apelidos.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    return `- ${e.nome}${extra ? ` (${extra})` : ""}`;
  });
  return montarPrompt(ler, "contexto-livro", {
    autor: g.autor.apelido
      ? `${g.autor.nome} (${g.autor.apelido})`
      : g.autor.nome,
    sobre: g.sobre || "(não informado)",
    glossario: linhas.join("\n") || "(vazio)",
    historias,
  });
}

export function listasDeChecagem(ler: LeitorPrompt): ListasChecagem {
  const conectores = ler("_conectores");
  return {
    causa: lerSecao(conectores, "causa"),
    emocao: lerSecao(conectores, "emocao"),
    antiSlop: lerSecao(ler("_anti-slop"), "automatica"),
  };
}

// ── Estruturar ───────────────────────────────────────────────────────────

export async function estruturar(
  ia: ClienteIA,
  ler: LeitorPrompt,
  arquivo: string,
  segmentos: Segmento[],
): Promise<RespostaIA<Estrutura>> {
  const ids = new Set(segmentos.map((s) => s.id));
  const falantes = new Set(segmentos.map((s) => s.falante));
  const r = await ia.gerar({
    etapa: "estruturar",
    modelo: MODELO_RAPIDO,
    maxTokens: 8000,
    esforco: "low",
    sistemaFixo: montarPrompt(ler, "estruturar"),
    usuario: montarPrompt(ler, "estruturar-entrada", {
      arquivo,
      segmentos: formatarSegmentos(segmentos),
    }),
    schema: Estrutura,
    // Sem recusa por falante: a estrutura é dica. Falante escrito de outro jeito ("speaker_0"
    // sem o "g1:", o uuid da gravação) é casado pelo speaker em completarFalantes.
  });
  // A estrutura é dica para a edição: id ou falante inventado é descartado, não derruba a história.
  return {
    ...r,
    dados: {
      falantes: completarFalantes(r.dados.falantes, [...falantes]),
      vazios: r.dados.vazios.filter((id) => ids.has(id)),
      mudancasDeAssunto: r.dados.mudancasDeAssunto.filter((id) => ids.has(id)),
    },
  };
}

/**
 * Com várias gravações (prompt 7), o modelo pode esquecer os falantes de uma delas
 * ("g2:speaker_0"). Quem ficou sem papel herda o do mesmo speaker em outra gravação; sem
 * nenhum, vira "outro". Assim a edição nunca recebe um falante sem papel.
 */
export function completarFalantes(
  dados: Estrutura["falantes"],
  todos: string[],
): Estrutura["falantes"] {
  const papel = new Map(dados.map((f) => [f.falante, f.papel]));
  const porSpeaker = new Map<string, Estrutura["falantes"][number]["papel"]>();
  for (const f of dados) {
    const speaker = f.falante.split(":").at(-1) ?? f.falante;
    if (!porSpeaker.has(speaker)) porSpeaker.set(speaker, f.papel);
  }
  // Uma pessoa só no áudio, e o modelo não a reconheceu: é o autor contando.
  if (todos.length === 1 && !papel.has(todos[0])) {
    const speaker = todos[0].split(":").at(-1) ?? todos[0];
    if (!porSpeaker.has(speaker))
      return [{ falante: todos[0], papel: "autor" }];
  }
  return todos.map((falante) => ({
    falante,
    papel:
      papel.get(falante) ??
      porSpeaker.get(falante.split(":").at(-1) ?? falante) ??
      "outro",
  }));
}

// ── Editar ───────────────────────────────────────────────────────────────

export function palavrasComConteudo(
  segmentos: Segmento[],
  estrutura: Estrutura,
): number {
  const vazios = new Set(estrutura.vazios);
  return segmentos
    .filter((s) => !vazios.has(s.id))
    .reduce((total, s) => total + contarPalavras(s.texto), 0);
}

export async function editar(
  ia: ClienteIA,
  ler: LeitorPrompt,
  p: {
    segmentos: Segmento[];
    estrutura: Estrutura;
    glossario: Glossario;
    tamanho: Tamanho;
    modelo?: string;
    aoPrimeiraPalavra?: () => void;
    historias?: string;
    aoTexto?: ChamadaIA<Edicao>["aoTexto"];
    intervaloTextoMs?: number;
  },
): Promise<RespostaIA<Edicao>> {
  const ids = new Set(p.segmentos.map((s) => s.id));
  const total = palavrasComConteudo(p.segmentos, p.estrutura);
  const papeis = p.estrutura.falantes
    .map((f) => `- ${f.falante}: ${f.papel}`)
    .join("\n");
  return ia.gerar({
    etapa: "editar",
    modelo: p.modelo ?? MODELO_CAPAZ,
    maxTokens: 32000,
    esforco: "medium",
    sistemaFixo: montarPrompt(ler, "editar"),
    sistemaLivro: contextoDoLivro(ler, p.glossario, p.historias),
    usuario: montarPrompt(ler, "editar-entrada", {
      papeis: papeis || "(não identificados)",
      vazios: p.estrutura.vazios.map(idSegmento).join(", ") || "nenhum",
      tamanho: p.tamanho,
      palavras_alvo: String(Math.round(total * TAMANHOS_TEXTO[p.tamanho])),
      palavras_transcricao: String(total),
      segmentos: formatarSegmentos(p.segmentos, p.estrutura),
    }),
    schema: Edicao,
    campoPrimeiraPalavra: "texto",
    aoPrimeiraPalavra: p.aoPrimeiraPalavra,
    aoTexto: p.aoTexto,
    intervaloTextoMs: p.intervaloTextoMs,
    validar: (e) => {
      if (e.paragrafos.length === 0) return "nenhum parágrafo";
      const semFonte = e.paragrafos.findIndex((par) => par.fontes.length === 0);
      if (semFonte >= 0) return `parágrafo ${semFonte + 1} sem fonte`;
      const fora = e.paragrafos
        .flatMap((par) => par.fontes)
        .filter((id) => !ids.has(id));
      return fora.length ? `fontes inexistentes: ${fora.join(", ")}` : null;
    },
  });
}

// ── Checar e verificar ("Confira") ──────────────────────────────────────

export function checar(
  edicao: Edicao,
  segmentos: Segmento[],
  listas: ListasChecagem,
): Marcacao[] {
  const porId = new Map(segmentos.map((s) => [s.id, s.texto]));
  return edicao.paragrafos.flatMap((par, i) => {
    const fontes = par.fontes.map((id) => porId.get(id) ?? "").join("\n");
    return checarParagrafo(i + 1, par.texto, fontes, listas);
  });
}

export function textoNumerado(edicao: Edicao): string {
  return edicao.paragrafos.map((p, i) => `[${i + 1}] ${p.texto}`).join("\n\n");
}

export async function verificar(
  ia: ClienteIA,
  ler: LeitorPrompt,
  p: {
    edicao: Edicao;
    segmentos: Segmento[];
    estrutura?: Estrutura;
    modelo?: string;
  },
): Promise<{
  resposta: RespostaIA<Verificacao>;
  marcacoes: Marcacao[];
  naoLocalizadas: number;
}> {
  const n = p.edicao.paragrafos.length;
  const resposta = await ia.gerar({
    etapa: "verificar",
    modelo: p.modelo ?? MODELO_CAPAZ,
    maxTokens: 16000,
    esforco: "medium",
    sistemaFixo: montarPrompt(ler, "verificar"),
    usuario: montarPrompt(ler, "verificar-entrada", {
      texto: textoNumerado(p.edicao),
      segmentos: formatarSegmentos(p.segmentos, p.estrutura),
    }),
    schema: Verificacao,
    validar: (v) => {
      const fora = v.marcadas.find((m) => m.paragrafo < 1 || m.paragrafo > n);
      return fora ? `parágrafo ${fora.paragrafo} não existe` : null;
    },
  });

  let naoLocalizadas = 0;
  const marcacoes: Marcacao[] = [];
  for (const m of resposta.dados.marcadas) {
    const texto = p.edicao.paragrafos[m.paragrafo - 1].texto;
    const pos = localizarTrecho(texto, m.trecho);
    if (!pos) naoLocalizadas++;
    marcacoes.push({
      paragrafo: m.paragrafo,
      inicio: pos?.inicio ?? 0,
      fim: pos?.fim ?? texto.length, // sem posição: marca o parágrafo inteiro
      trecho: m.trecho,
      tipo: m.tipo,
      origem: "verificador",
      motivo: `${m.status === "parcial" ? "parcial" : "sem sustentação"}: ${m.motivo}`,
    });
  }
  return { resposta, marcacoes, naoLocalizadas };
}

// ── Memória do livro (prompt 6) ──────────────────────────────────────────

/** Resumo, temas e nomes citados, a partir do texto pronto. Modelo rápido. */
export async function memoria(
  ia: ClienteIA,
  ler: LeitorPrompt,
  edicao: Edicao,
  perguntas: string[] = [], // pendentes, para sugerir a que a história responde (prompt 7)
): Promise<RespostaIA<Memoria>> {
  const r = await ia.gerar({
    etapa: "memoria",
    modelo: MODELO_RAPIDO,
    maxTokens: 2000,
    esforco: "low",
    sistemaFixo: montarPrompt(ler, "memoria"),
    usuario: montarPrompt(ler, "memoria-entrada", {
      titulo: edicao.titulo,
      texto: textoNumerado(edicao),
      perguntas: listaDePerguntas(perguntas),
    }),
    schema: Memoria,
  });
  // Número fora da lista = nenhuma (não derruba a memória).
  const n = r.dados.pergunta;
  const valida = n != null && n >= 1 && n <= perguntas.length;
  return { ...r, dados: { ...r.dados, pergunta: valida ? n : null } };
}

export function listaDePerguntas(perguntas: string[]): string {
  return (
    perguntas
      .map((t, i) => `P${i + 1}. ${t.replace(/\s+/g, " ").trim()}`)
      .join("\n") || "(nenhuma)"
  );
}

// ── Divisão em histórias (prompt 7) ──────────────────────────────────────

export type GravacaoDaDivisao = {
  rotulo: string; // "g1": o mesmo do falante na transcrição
  minutos: number;
  pergunta: string | null; // a pergunta escolhida no envio, se houver
};

/**
 * Propõe as histórias de um grupo de gravações (lote, conversa em partes ou arquivo longo).
 * Modelo capaz (D11). A limpeza e as regras de dono de cada segmento ficam em
 * lib/divisao/limpar.ts: aqui só a chamada.
 */
export async function dividir(
  ia: ClienteIA,
  ler: LeitorPrompt,
  p: {
    autor: string;
    segmentos: Segmento[];
    estrutura: Estrutura;
    gravacoes: GravacaoDaDivisao[];
    perguntas: string[];
    minFalaS: number;
    maxFalaMin: number;
    modelo?: string;
  },
): Promise<RespostaIA<Divisao>> {
  const ids = new Set(p.segmentos.map((s) => s.id));
  return ia.gerar({
    etapa: "dividir",
    modelo: p.modelo ?? MODELO_CAPAZ,
    maxTokens: 8000,
    esforco: "medium",
    sistemaFixo: montarPrompt(ler, "dividir", {
      min_fala_s: String(p.minFalaS),
      max_fala_min: String(p.maxFalaMin),
    }),
    usuario: montarPrompt(ler, "dividir-entrada", {
      autor: p.autor,
      gravacoes: p.gravacoes
        .map(
          (g) =>
            `- ${g.rotulo} · ${Math.max(1, Math.round(g.minutos))} min${g.pergunta ? ` · pergunta: ${g.pergunta.replace(/\s+/g, " ")}` : ""}`,
        )
        .join("\n"),
      perguntas: listaDePerguntas(p.perguntas),
      segmentos: formatarSegmentos(p.segmentos, p.estrutura),
    }),
    schema: Divisao,
    validar: (d) => {
      if (d.historias.length === 0) return "nenhuma história";
      const algum = d.historias.some((h) =>
        h.trechos.some((t) => ids.has(t.de) || ids.has(t.ate)),
      );
      return algum ? null : "nenhum trecho com segmento conhecido";
    },
  });
}

// ── IA sob controle (prompt 9) ───────────────────────────────────────────

/** Parágrafo como as etapas do prompt 9 o veem (o do editor, sem depender dele). */
export type ParagrafoAtual = {
  id: string;
  texto: string;
  fontes: number[];
  editado: boolean;
};

function listaDeFontes(fontes: number[]): string {
  return fontes.map(idSegmento).join(", ") || "nenhuma";
}

function papeisDe(estrutura: Estrutura): string {
  return (
    estrutura.falantes.map((f) => `- ${f.falante}: ${f.papel}`).join("\n") ||
    "(não identificados)"
  );
}

/**
 * Tamanho (prompt 9): a mesma edição, a partir da base estruturada (T11), com os parágrafos
 * travados no lugar como marcadores. O texto travado nunca vem da IA.
 */
export async function editarComTravados(
  ia: ClienteIA,
  ler: LeitorPrompt,
  p: {
    segmentos: Segmento[];
    estrutura: Estrutura;
    glossario: Glossario;
    tamanho: Tamanho;
    travados: ParagrafoAtual[];
    historias?: string;
    modelo?: string;
  },
): Promise<RespostaIA<EdicaoComTravados>> {
  const ids = new Set(p.segmentos.map((s) => s.id));
  const total = palavrasComConteudo(p.segmentos, p.estrutura);
  const travados =
    p.travados
      .map(
        (t) =>
          `[TRAVADO ${t.id}] (fontes ${listaDeFontes(t.fontes)}) ${t.texto}`,
      )
      .join("\n\n") || "(nenhum)";
  return ia.gerar({
    etapa: "tamanho",
    modelo: p.modelo ?? MODELO_CAPAZ,
    maxTokens: 32000,
    esforco: "medium",
    sistemaFixo: montarPrompt(ler, "editar"),
    sistemaLivro: contextoDoLivro(ler, p.glossario, p.historias),
    usuario: montarPrompt(ler, "tamanho-entrada", {
      papeis: papeisDe(p.estrutura),
      vazios: p.estrutura.vazios.map(idSegmento).join(", ") || "nenhum",
      tamanho: p.tamanho,
      palavras_alvo: String(Math.round(total * TAMANHOS_TEXTO[p.tamanho])),
      palavras_transcricao: String(total),
      travados,
      segmentos: formatarSegmentos(p.segmentos, p.estrutura),
    }),
    schema: EdicaoComTravados,
    validar: (e) => {
      const novos = e.paragrafos.filter((x) => !x.travado);
      const semFonte = novos.findIndex(
        (x) => x.texto.trim() && x.fontes.length === 0,
      );
      if (semFonte >= 0) return `parágrafo novo ${semFonte + 1} sem fonte`;
      const fora = novos.flatMap((x) => x.fontes).filter((id) => !ids.has(id));
      return fora.length ? `fontes inexistentes: ${fora.join(", ")}` : null;
    },
  });
}

/** Acrescentar áudio (prompt 9): só inserções e trocas sobre o capítulo atual. */
export async function integrar(
  ia: ClienteIA,
  ler: LeitorPrompt,
  p: {
    capitulo: ParagrafoAtual[];
    segmentosNovos: Segmento[];
    segmentosAntigos: Segmento[];
    estrutura: Estrutura;
    glossario: Glossario;
    historias?: string;
    modelo?: string;
  },
): Promise<RespostaIA<Integracao>> {
  const ids = new Set(
    [...p.segmentosNovos, ...p.segmentosAntigos].map((s) => s.id),
  );
  const capitulo = p.capitulo
    .map(
      (x) =>
        `[${x.id}${x.editado ? " TRAVADO" : ""}] (fontes ${listaDeFontes(x.fontes)}) ${x.texto}`,
    )
    .join("\n\n");
  return ia.gerar({
    etapa: "integrar",
    modelo: p.modelo ?? MODELO_CAPAZ,
    maxTokens: 16000,
    esforco: "medium",
    sistemaFixo: montarPrompt(ler, "integrar"),
    sistemaLivro: contextoDoLivro(ler, p.glossario, p.historias),
    usuario: montarPrompt(ler, "integrar-entrada", {
      papeis: papeisDe(p.estrutura),
      capitulo,
      segmentos_novos: formatarSegmentos(p.segmentosNovos, p.estrutura),
      segmentos_antigos:
        formatarSegmentos(p.segmentosAntigos, p.estrutura) || "(nenhuma)",
    }),
    schema: Integracao,
    validar: (r) => {
      const pars = r.operacoes.flatMap((o) => o.paragrafos);
      if (pars.some((x) => x.texto.trim() && x.fontes.length === 0))
        return "parágrafo sem fonte";
      const fora = pars.flatMap((x) => x.fontes).filter((id) => !ids.has(id));
      return fora.length ? `fontes inexistentes: ${fora.join(", ")}` : null;
    },
  });
}

export const INSTRUCOES_REVISAR = {
  curto: "curto (mais curto)",
  fiel: "fiel (mais fiel à fala)",
  corrigir: "corrigir",
  livre: "livre (o pedido escrito abaixo)",
} as const;
export type InstrucaoRevisar = keyof typeof INSTRUCOES_REVISAR;

/** Revisar trecho (prompt 9): um único substituto para o trecho escolhido. */
export async function revisar(
  ia: ClienteIA,
  ler: LeitorPrompt,
  p: {
    paragrafo: string;
    trecho: string;
    antes: string | null;
    depois: string | null;
    instrucao: InstrucaoRevisar;
    textoLivre: string | null;
    segmentos: Segmento[];
    estrutura?: Estrutura;
    glossario: Glossario;
    modelo?: string;
  },
): Promise<RespostaIA<Revisao>> {
  // O pedido escrito vai delimitado, sem os marcadores (não fecha o bloco antes da hora).
  const livre = p.textoLivre
    ? `<pedido>${p.textoLivre.replace(/<\/?pedido>/gi, "").trim()}</pedido>`
    : "";
  return ia.gerar({
    etapa: "revisar",
    modelo: p.modelo ?? MODELO_CAPAZ,
    maxTokens: 4000,
    esforco: "low",
    sistemaFixo: montarPrompt(ler, "revisar"),
    sistemaLivro: contextoDoLivro(ler, p.glossario),
    usuario: montarPrompt(ler, "revisar-entrada", {
      antes: p.antes ?? "(nenhum)",
      paragrafo: p.paragrafo,
      trecho: p.trecho,
      depois: p.depois ?? "(nenhum)",
      instrucao: INSTRUCOES_REVISAR[p.instrucao],
      pedido_livre: livre,
      segmentos: formatarSegmentos(p.segmentos, p.estrutura),
    }),
    schema: Revisao,
    validar: (r) => (r.substituto.trim() ? null : "substituto vazio"),
  });
}

export { nomesDoGlossario };
