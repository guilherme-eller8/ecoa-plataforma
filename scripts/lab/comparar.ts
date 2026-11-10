// npm run lab -- --comparar <historia>: ia.json × editado.md → lab/aprendizados.md
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { MODELO_RAPIDO } from "@/lib/config";
import type { LeitorPrompt } from "@/lib/ai/carregar-prompt";
import type { ClienteIA } from "@/lib/ai/claude";
import {
  classificarEdicoes,
  comparar,
  escapes,
  type Comparacao,
} from "@/lib/ai/comparar";
import { custoClaudeUSD, emReais, formatarReais } from "@/lib/ai/custo";
import type { ClassificacaoEdicoes } from "@/lib/ai/schemas";
import {
  lerEditado,
  lerSaidaIA,
  motivosDoEditado,
  type SaidaIA,
} from "./saidas";

const ROTULO: Record<string, string> = {
  invencao_removida: "Invenção removida",
  transcricao: "Erro de transcrição",
  voz_restaurada: "Voz restaurada",
  corte_excessivo: "Corte excessivo",
  informacao_nova: "Informação nova da família (não é erro da IA)",
  ordem: "Ordem trocada",
  estilo: "Preferência de estilo",
};

export function textoAprendizados(
  saida: SaidaIA,
  c: Comparacao,
  cl: ClassificacaoEdicoes,
  motivos: string[],
  data: string,
): string {
  const esc = escapes(c, cl);
  const L: string[] = [`## ${saida.historia} · ${data}`, ""];
  if (esc.length)
    L.push(
      `**⚠ ESCAPE: ${esc.length} invenção(ões) removida(s) de parágrafo sem Confira.** Critério de morte: revisar \`verificar.md\` e \`_conectores.md\`.`,
      "",
    );
  L.push(
    `- Parágrafos alterados: ${c.paragrafosAlterados} de ${c.paragrafosIa} (${Math.round(c.percentualAlterado * 100)}%; meta: no máximo 33%)`,
    `- Palavras: +${c.palavrasAdicionadas} / −${c.palavrasRemovidas}`,
    `- Gerado com: ${saida.modelos.capaz}, transcrição ${saida.provedor}, prompts ${Object.entries(
      saida.hashPrompts,
    )
      .filter(([k]) =>
        ["_regras", "_estilo", "editar", "verificar"].includes(k),
      )
      .map(([k, v]) => `${k}:${v}`)
      .join(" ")}`,
    "",
  );
  const porCategoria = new Map<string, ClassificacaoEdicoes["mudancas"]>();
  for (const m of cl.mudancas)
    porCategoria.set(m.categoria, [
      ...(porCategoria.get(m.categoria) ?? []),
      m,
    ]);
  for (const [cat, ms] of porCategoria) {
    L.push(`### ${ROTULO[cat] ?? cat} (${ms.length})`, "");
    for (const m of ms) {
      const escape = esc.includes(m) ? " **ESCAPE**" : "";
      L.push(
        `- ${m.tipo ? `[${m.tipo}]` : ""}${escape}`,
        `  - IA: ${m.antes}`,
        `  - Família: ${m.depois}`,
        `  - Sugestão: ${m.sugestao}`,
      );
    }
    L.push("");
  }
  if (motivos.length) {
    L.push(
      "### Comentários da família",
      "",
      ...motivos.map((m) => `- ${m}`),
      "",
    );
  }
  return L.join("\n");
}

export async function executarComparacao(
  dirHistoria: string,
  d: { ia: ClienteIA; ler: LeitorPrompt; dirLab: string },
): Promise<{ comparacao: Comparacao; classificacao: ClassificacaoEdicoes }> {
  const saida = lerSaidaIA(dirHistoria);
  const arquivoEditado = join(dirHistoria, "editado.md");
  if (!existsSync(arquivoEditado)) {
    throw new Error(
      `Falta ${arquivoEditado}. Copie ia.md para editado.md, corrija o texto e rode de novo.`,
    );
  }
  const md = readFileSync(arquivoEditado, "utf8");
  const editado = lerEditado(md);
  const c = comparar(
    saida.edicao.paragrafos.map((p) => p.texto),
    editado.paragrafos,
    saida.marcacoes,
  );

  let classificacao: ClassificacaoEdicoes = { mudancas: [] };
  let custo = 0;
  if (c.pares.some((p) => p.mudou)) {
    const r = await classificarEdicoes(d.ia, d.ler, c, saida.segmentos);
    classificacao = r.dados;
    custo = custoClaudeUSD(MODELO_RAPIDO, r.uso);
  }

  const data = new Date().toISOString().slice(0, 16).replace("T", " ");
  const texto = textoAprendizados(
    saida,
    c,
    classificacao,
    motivosDoEditado(md),
    data,
  );
  const arquivoAprendizados = join(d.dirLab, "aprendizados.md");
  if (!existsSync(arquivoAprendizados)) {
    writeFileSync(
      arquivoAprendizados,
      "# Aprendizados com as correções da família\n\nUm padrão que aparece em 2 histórias vira regra nos .md de lib/ai/prompts/. Nada muda o prompt sozinho.\n\n",
    );
  }
  appendFileSync(arquivoAprendizados, `${texto}\n`);
  writeFileSync(
    join(dirHistoria, "comparacao.json"),
    JSON.stringify({ data, comparacao: c, classificacao }, null, 2),
  );

  const esc = escapes(c, classificacao).length;
  console.log(
    `${saida.historia}: ${c.paragrafosAlterados}/${c.paragrafosIa} parágrafos alterados, ${classificacao.mudancas.length} mudança(s) classificada(s), ${esc} escape(s). Custo ${formatarReais(emReais(custo))}.`,
  );
  console.log("Aprendizados em lab/aprendizados.md");
  return { comparacao: c, classificacao };
}
