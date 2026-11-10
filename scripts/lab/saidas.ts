// Versão da IA guardada sem alteração (ia.json) e cópia legível para a família corrigir (ia.md).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Edicao, Marcacao, Segmento } from "@/lib/ai/schemas";
import type { ResultadoHistoria, ResultadoTamanho, Rodada } from "./pipeline";

export const VERSAO_SAIDA = 1;

export type SaidaIA = {
  versao: number;
  historia: string;
  arquivo: string;
  geradaEm: string;
  simulado: boolean;
  provedor: string;
  modeloTranscricao: string;
  modelos: Rodada["modelos"];
  hashPrompts: Record<string, string>;
  tamanho: string;
  edicao: Edicao;
  marcacoes: Marcacao[];
  segmentos: Segmento[];
};

/** Texto do parágrafo com um ⚠ no fim de cada trecho marcado (trechos sobrepostos viram um só). */
export function comAvisos(texto: string, marcas: Marcacao[]): string {
  const faixas = [...marcas]
    .sort((a, b) => a.inicio - b.inicio)
    .reduce<{ inicio: number; fim: number }[]>((acc, m) => {
      const ultima = acc[acc.length - 1];
      if (ultima && m.inicio <= ultima.fim)
        ultima.fim = Math.max(ultima.fim, m.fim);
      else acc.push({ inicio: m.inicio, fim: m.fim });
      return acc;
    }, []);
  let r = texto;
  for (const f of faixas.reverse())
    r = `${r.slice(0, f.fim)} ⚠${r.slice(f.fim)}`;
  return r;
}

export function renderizarIaMd(t: ResultadoTamanho): string {
  const linhas = [`# ${t.edicao.titulo}`, ""];
  t.edicao.paragrafos.forEach((p, i) => {
    linhas.push(
      comAvisos(
        p.texto,
        t.marcacoes.filter((m) => m.paragrafo === i + 1),
      ),
      "",
    );
  });
  linhas.push(
    "---",
    "",
    "Corrija o texto acima à vontade e salve como editado.md na mesma pasta. Tudo abaixo da linha é ignorado.",
    "",
  );
  if (t.marcacoes.length) {
    linhas.push("## Confira (pode não estar no áudio)", "");
    for (const m of t.marcacoes)
      linhas.push(
        `- ⚠ parágrafo ${m.paragrafo}: "${m.trecho}" (${m.tipo}): ${m.motivo}`,
      );
    linhas.push("");
  }
  if (t.edicao.lacunas.length) {
    linhas.push("## Perguntas para a próxima conversa", "");
    for (const l of t.edicao.lacunas)
      linhas.push(`- ${l.pergunta} (${l.motivo})`);
    linhas.push("");
  }
  return linhas.join("\n");
}

/**
 * Grava lab/saidas/<historia>/. O ia.json que a família corrigiu nunca é sobrescrito:
 * se já existe editado.md, a rodada nova vai só para historico/.
 */
export function gravarSaidas(
  dirSaidas: string,
  rodada: Rodada,
  h: ResultadoHistoria,
): string[] {
  if (h.erro || h.tamanhos.length === 0) return [];
  const dir = join(dirSaidas, h.id);
  const historico = join(dir, "historico");
  mkdirSync(historico, { recursive: true });
  const principal =
    h.tamanhos.find((t) => t.tamanho === "medio") ?? h.tamanhos[0];
  const saida: SaidaIA = {
    versao: VERSAO_SAIDA,
    historia: h.id,
    arquivo: h.arquivo,
    geradaEm: rodada.geradaEm,
    simulado: rodada.simulado,
    provedor: h.provedor,
    modeloTranscricao: h.modeloTranscricao,
    modelos: rodada.modelos,
    hashPrompts: rodada.hashPrompts,
    tamanho: principal.tamanho,
    edicao: principal.edicao,
    marcacoes: principal.marcacoes,
    segmentos: h.segmentos,
  };
  const json = JSON.stringify(saida, null, 2);
  const carimbo = rodada.geradaEm.replace(/[:.]/g, "-");
  writeFileSync(join(historico, `${carimbo}.json`), json);
  const gravados = [join(historico, `${carimbo}.json`)];
  if (existsSync(join(dir, "editado.md"))) return gravados;
  writeFileSync(join(dir, "ia.json"), json);
  writeFileSync(join(dir, "ia.md"), renderizarIaMd(principal));
  for (const t of h.tamanhos.filter((x) => x !== principal)) {
    writeFileSync(join(dir, `ia-${t.tamanho}.md`), renderizarIaMd(t));
  }
  return [...gravados, join(dir, "ia.json"), join(dir, "ia.md")];
}

export function lerSaidaIA(dir: string): SaidaIA {
  const arquivo = join(dir, "ia.json");
  if (!existsSync(arquivo))
    throw new Error(
      `Não achei ${arquivo}. Rode \`npm run lab\` antes de comparar.`,
    );
  return JSON.parse(readFileSync(arquivo, "utf8")) as SaidaIA;
}

/** Lê o editado.md: título, parágrafos separados por linha em branco, até a linha "---". */
export function lerEditado(md: string): {
  titulo: string;
  paragrafos: string[];
} {
  const corpo = md.split(/^---\s*$/m)[0];
  let titulo = "";
  const paragrafos: string[] = [];
  for (const bloco of corpo.split(/\n\s*\n/)) {
    const limpo = bloco
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s*⚠/g, "")
      .trim();
    if (!limpo) continue;
    if (limpo.startsWith("# ")) titulo = limpo.slice(2).trim();
    else paragrafos.push(limpo.replace(/\s*\n\s*/g, " "));
  }
  return { titulo, paragrafos };
}

/** Comentários <!-- motivo: ... --> deixados pela família. */
export function motivosDoEditado(md: string): string[] {
  return [...md.matchAll(/<!--\s*motivo:\s*([\s\S]*?)-->/g)].map((m) =>
    m[1].trim(),
  );
}
