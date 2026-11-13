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
  Edicao,
  Estrutura,
  Memoria,
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
    // Só recusa se nenhum falante bate: aí a resposta não serve para nada.
    validar: (e) =>
      e.falantes.length > 0 && !e.falantes.some((f) => falantes.has(f.falante))
        ? `nenhum falante conhecido (${e.falantes.length} citados, ${falantes.size} no áudio)`
        : null,
  });
  // A estrutura é dica para a edição: id ou falante inventado é descartado, não derruba a história.
  return {
    ...r,
    dados: {
      falantes: r.dados.falantes.filter((f) => falantes.has(f.falante)),
      vazios: r.dados.vazios.filter((id) => ids.has(id)),
      mudancasDeAssunto: r.dados.mudancasDeAssunto.filter((id) => ids.has(id)),
    },
  };
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
): Promise<RespostaIA<Memoria>> {
  return ia.gerar({
    etapa: "memoria",
    modelo: MODELO_RAPIDO,
    maxTokens: 2000,
    esforco: "low",
    sistemaFixo: montarPrompt(ler, "memoria"),
    usuario: montarPrompt(ler, "memoria-entrada", {
      titulo: edicao.titulo,
      texto: textoNumerado(edicao),
    }),
    schema: Memoria,
  });
}

export { nomesDoGlossario };
