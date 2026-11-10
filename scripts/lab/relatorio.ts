// lab/relatorio.md: veredito no topo, uma seção por história, custo projetado no fim.
import {
  META_CUSTO_LIVRO_BRL,
  META_PRIMEIRAS_PALAVRAS_S,
  PRECOS_TRANSCRICAO_CONFIRMADOS,
  PREMISSA_HISTORIAS_POR_LIVRO,
  PREMISSA_MIN_AUDIO_POR_HISTORIA,
  PREMISSA_TROCAS_TAMANHO_POR_HISTORIA,
} from "@/lib/config";
import { emReais, formatarReais, projetarLivroUSD } from "@/lib/ai/custo";
import { idSegmento } from "@/lib/ai/schemas";
import type { Rodada } from "./pipeline";
import { comAvisos } from "./saidas";

const seg = (ms: number | null) =>
  ms === null ? "—" : `${(ms / 1000).toFixed(1)} s`;
const brl = (usd: number) => formatarReais(emReais(usd));
const media = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

export function projecao(
  r: Rodada,
): { usdLivro: number; minutos: number } | null {
  const ok = r.historias.filter((h) => !h.erro && h.minutos > 0);
  const minutos = ok.reduce((n, h) => n + h.minutos, 0);
  if (minutos === 0) return null;
  const soma = (f: (h: (typeof ok)[number]) => number) =>
    ok.reduce((n, h) => n + f(h), 0) / minutos;
  return {
    minutos,
    usdLivro: projetarLivroUSD({
      transcricao: soma((h) => h.transcricao.custoUSD),
      estruturar: soma((h) => h.estruturar.custoUSD),
      editar: soma((h) => media(h.tamanhos.map((t) => t.editar.custoUSD))),
      verificar: soma((h) =>
        media(h.tamanhos.map((t) => t.verificar.custoUSD)),
      ),
    }),
  };
}

export function gerarRelatorio(r: Rodada): string {
  const L: string[] = [];
  const ok = r.historias.filter((h) => !h.erro);
  const tamanhos = ok.flatMap((h) => h.tamanhos);
  const confira = tamanhos.reduce((n, t) => n + t.marcacoes.length, 0);
  const doVerificador = tamanhos.reduce(
    (n, t) => n + t.marcacoes.filter((m) => m.origem === "verificador").length,
    0,
  );
  const primeiras = tamanhos
    .map((t) => t.msPrimeiraPalavraArquivo)
    .filter((x): x is number => x !== null);
  const piorPrimeira = primeiras.length ? Math.max(...primeiras) : null;
  const proj = projecao(r);

  L.push("# Relatório do laboratório de IA", "");
  if (r.simulado)
    L.push(
      "> **SIMULADO (LAB_FAKE).** Dados de teste, sem IA real. Não é evidência de qualidade.",
      "",
    );
  if (!PRECOS_TRANSCRICAO_CONFIRMADOS)
    L.push(
      "> **PROVISÓRIO:** preço do provedor de transcrição não confirmado em `lib/config.ts`.",
      "",
    );

  L.push("## Veredito", "");
  L.push(
    `- **Histórias:** ${ok.length} de ${r.historias.length} processadas${r.historias.length > ok.length ? " (ver erros abaixo)" : ""}, ${proj ? proj.minutos.toFixed(1) : "0"} min de áudio, em ${seg(r.msTotal)}.`,
  );
  L.push(
    `- **Confira:** ${confira} marcações (${doVerificador} do verificador, ${confira - doVerificador} das checagens). As invenções que escaparam só aparecem no \`--comparar\`, depois da correção da família.`,
  );
  L.push(
    `- **Primeira palavra:** pior caso ${seg(piorPrimeira)} desde o início do arquivo (meta: ${META_PRIMEIRAS_PALAVRAS_S} s, sem contar o upload)${piorPrimeira !== null && piorPrimeira > META_PRIMEIRAS_PALAVRAS_S * 1000 ? " ⚠ acima da meta" : ""}.`,
  );
  if (proj && r.simulado) {
    L.push(
      "- **Custo projetado por livro:** não se aplica em rodada simulada.",
    );
  } else if (proj) {
    const livro = emReais(proj.usdLivro);
    L.push(
      `- **Custo projetado por livro:** ${formatarReais(livro)} (meta: ${formatarReais(META_CUSTO_LIVRO_BRL)}) ${livro <= META_CUSTO_LIVRO_BRL ? "dentro da meta" : "⚠ acima da meta"}${PRECOS_TRANSCRICAO_CONFIRMADOS ? "" : ", provisório"}.`,
    );
  }
  L.push("");

  for (const h of r.historias) {
    L.push(
      `## ${h.id}`,
      "",
      `Arquivo \`${h.arquivo}\`, ${h.minutos.toFixed(1)} min, transcrição ${h.provedor} (${h.modeloTranscricao})${h.transcricaoDoCache ? ", do cache" : ""}.`,
      "",
    );
    if (h.erro) {
      L.push(`**Erro:** ${h.erro}`, "");
      continue;
    }

    const papel = new Map(
      h.estrutura?.falantes.map((f) => [f.falante, f.papel]),
    );
    const vazios = new Set(h.estrutura?.vazios);
    L.push("<details><summary>Transcrição</summary>", "");
    for (const s of h.segmentos) {
      L.push(
        `- ${idSegmento(s.id)} **${papel.get(s.falante) ?? s.falante}**${vazios.has(s.id) ? " _(vazio)_" : ""}: ${s.texto}`,
      );
    }
    L.push("", "</details>", "");

    for (const t of h.tamanhos) {
      L.push(`### ${t.edicao.titulo} (${t.tamanho})`, "");
      L.push(
        `${t.palavras} palavras (alvo ${t.palavrasAlvo}) · ${t.marcacoes.length} Confira${t.naoLocalizadas ? ` · ${t.naoLocalizadas} trecho(s) do verificador não localizado(s), parágrafo inteiro marcado` : ""}`,
        "",
      );
      t.edicao.paragrafos.forEach((p, i) => {
        L.push(
          `${comAvisos(
            p.texto,
            t.marcacoes.filter((m) => m.paragrafo === i + 1),
          )} <sub>${p.fontes.map(idSegmento).join(", ")}</sub>`,
          "",
        );
      });
      if (t.marcacoes.length) {
        L.push("**Confira:**", "");
        for (const m of t.marcacoes)
          L.push(
            `- ⚠ §${m.paragrafo} "${m.trecho}" · ${m.tipo} · ${m.origem} · ${m.motivo}`,
          );
        L.push("");
      }
    }

    const lacunas = h.tamanhos[0]?.edicao.lacunas ?? [];
    if (lacunas.length) {
      L.push("**Perguntas para a próxima conversa:**", "");
      for (const l of lacunas) L.push(`- ${l.pergunta} _(${l.motivo})_`);
      L.push("");
    }

    L.push(
      "| Etapa | Tempo | Tokens (entrada / saída / cache lido) | Custo |",
      "| --- | --- | --- | --- |",
    );
    L.push(
      `| Transcrição | ${seg(h.transcricao.ms)} | — | ${brl(h.transcricao.custoUSD)} |`,
    );
    const linha = (
      nome: string,
      e: {
        ms: number;
        uso?: { entrada: number; saida: number; cacheLido: number };
        custoUSD: number;
      },
    ) =>
      `| ${nome} | ${seg(e.ms)} | ${e.uso ? `${e.uso.entrada} / ${e.uso.saida} / ${e.uso.cacheLido}` : "—"} | ${brl(e.custoUSD)} |`;
    L.push(linha("Estruturar", h.estruturar));
    for (const t of h.tamanhos) {
      L.push(
        linha(
          `Editar (${t.tamanho}) · 1ª palavra ${seg(t.msPrimeiraPalavraChamada)}`,
          t.editar,
        ),
      );
      L.push(linha(`Verificar (${t.tamanho})`, t.verificar));
    }
    L.push("");
  }

  L.push("## Custo projetado por livro", "");
  if (proj && r.simulado) {
    L.push(
      "Rodada simulada: tokens e minutos são fictícios, a projeção não tem significado.",
      "",
    );
  } else if (proj) {
    L.push(
      `Custo medido por minuto de áudio × premissas de \`lib/config.ts\`: ${PREMISSA_HISTORIAS_POR_LIVRO} histórias de ${PREMISSA_MIN_AUDIO_POR_HISTORIA} min, ${PREMISSA_TROCAS_TAMANHO_POR_HISTORIA} trocas de tamanho por história (cada troca refaz edição e verificação).`,
      "",
    );
    L.push(
      `**${brl(proj.usdLivro)} por livro** (US$ ${proj.usdLivro.toFixed(2)}).`,
      "",
    );
  } else {
    L.push("Sem história processada: não dá para projetar.", "");
  }

  L.push(
    "---",
    "",
    `Rodada ${r.geradaEm} · modelos ${r.modelos.rapido} e ${r.modelos.capaz} · prompts ${Object.entries(
      r.hashPrompts,
    )
      .map(([k, v]) => `${k}:${v}`)
      .join(" ")}`,
  );
  return L.join("\n");
}
