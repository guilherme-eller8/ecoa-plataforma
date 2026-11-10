import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { leitorDeDiretorio } from "@/lib/ai/carregar-prompt";
import type { Transcritor } from "@/lib/ai/transcricao";
import { executarComparacao } from "./comparar";
import { AMOSTRAS, ClienteFalso, transcreverFalso } from "./fakes";
import { carregarGlossario } from "./glossario";
import { rodarLab, type Dependencias } from "./pipeline";
import { gerarRelatorio } from "./relatorio";
import { comAvisos, gravarSaidas, lerEditado } from "./saidas";

const ler = leitorDeDiretorio(join(process.cwd(), "lib/ai/prompts"));
const glossario = carregarGlossario(join(process.cwd(), "lab"), true);
const audios = Object.keys(AMOSTRAS).map((a) => `/x/${a}`);

function deps(
  ia = new ClienteFalso(),
  transcrever: Transcritor = transcreverFalso,
): Dependencias {
  return {
    ia,
    transcrever,
    chaveProvedor: "",
    modeloTranscricao: "simulado",
    carregarAudio: async (c) => ({
      audio: new TextEncoder().encode(c),
      minutos: 1,
    }),
    ler,
    dirCache: mkdtempSync(join(tmpdir(), "lab-cache-")),
  };
}

const params = {
  provedor: "simulado",
  tamanhos: ["medio" as const],
  semCache: false,
  glossario,
  concorrencia: 2,
  simulado: true,
};

describe("pipeline do lab (simulado)", () => {
  it("processa as histórias, marca a emoção inventada e gera o relatório", async () => {
    const r = await rodarLab(audios, params, deps());
    expect(r.historias.map((h) => h.erro)).toEqual([null, null]);
    const t = r.historias[0].tamanhos[0];
    expect(
      t.marcacoes.some((m) => m.tipo === "emocao" && m.origem === "checagem"),
    ).toBe(true);
    expect(t.marcacoes.some((m) => m.origem === "verificador")).toBe(true);
    expect(t.msPrimeiraPalavraArquivo).not.toBeNull();
    const md = gerarRelatorio(r);
    expect(md).toContain("SIMULADO");
    expect(md.indexOf("## Veredito")).toBeLessThan(
      md.indexOf("## amostra-casamento"),
    );
    expect(md).toContain("Perguntas para a próxima conversa");
  });

  it("com verificador cego, as checagens ainda pegam a emoção inventada", async () => {
    const r = await rodarLab(
      audios,
      params,
      deps(new ClienteFalso({ verificador: "cego", inventar: true })),
    );
    const marcas = r.historias.flatMap((h) =>
      h.tamanhos.flatMap((t) => t.marcacoes),
    );
    expect(marcas.every((m) => m.origem === "checagem")).toBe(true);
    expect(marcas.some((m) => m.tipo === "emocao")).toBe(true);
  });

  it("falha de um arquivo não derruba os outros", async () => {
    const falhaNoTrem: Transcritor = async (a, nome, o) => {
      if (nome.includes("trem")) throw new Error("provedor fora do ar");
      return transcreverFalso(a, nome, o);
    };
    const r = await rodarLab(
      audios,
      params,
      deps(new ClienteFalso(), falhaNoTrem),
    );
    expect(r.historias.map((h) => h.erro)).toEqual([
      null,
      "provedor fora do ar",
    ]);
    expect(gerarRelatorio(r)).toContain("**Erro:** provedor fora do ar");
  });

  it("usa o cache de transcrição na segunda rodada", async () => {
    const d = deps();
    let chamadas = 0;
    d.transcrever = async (...a) => (chamadas++, transcreverFalso(...a));
    await rodarLab(audios, params, d);
    const r2 = await rodarLab(audios, params, d);
    expect(chamadas).toBe(2);
    expect(r2.historias.every((h) => h.transcricaoDoCache)).toBe(true);
  });
});

describe("glossário e consentimento", () => {
  it("recusa a rodada real sem consentimento", () => {
    const dir = mkdtempSync(join(tmpdir(), "lab-"));
    writeFileSync(
      join(dir, "glossario.json"),
      JSON.stringify({ autor: { nome: "X" } }),
    );
    expect(() => carregarGlossario(dir, false)).toThrow(/consentimento/);
    expect(carregarGlossario(dir, true).autor.nome).toBe("X");
  });

  it("explica quando falta o glossário", () => {
    expect(() =>
      carregarGlossario(mkdtempSync(join(tmpdir(), "lab-")), false),
    ).toThrow(/glossario.exemplo.json/);
  });
});

describe("saídas e comparação", () => {
  it("põe um ⚠ só por trecho, mesmo com marcações sobrepostas", () => {
    const m = (inicio: number, fim: number) => ({
      paragrafo: 1,
      inicio,
      fim,
      trecho: "",
      tipo: "emocao" as const,
      origem: "checagem" as const,
      motivo: "",
    });
    expect(comAvisos("Fiquei emocionado. Fim.", [m(7, 17), m(0, 18)])).toBe(
      "Fiquei emocionado. ⚠ Fim.",
    );
  });

  it("lê o editado.md ignorando avisos, comentários e o rodapé", () => {
    const e = lerEditado(
      "# Título\n\nUm ⚠ texto\nquebrado.\n\n<!-- motivo: x -->\n\nDois.\n\n---\n\n## Confira\n- nada",
    );
    expect(e).toEqual({
      titulo: "Título",
      paragrafos: ["Um texto quebrado.", "Dois."],
    });
  });

  it("nunca sobrescreve o ia.json que a família já corrigiu, e compara com escape", async () => {
    const dirLab = mkdtempSync(join(tmpdir(), "lab-"));
    const ia = new ClienteFalso({ verificador: "cego", inventar: true });
    const semChecagem = {
      ...deps(ia),
      ler: (n: string) =>
        n === "_conectores" ? "## causa\n## emocao\n" : ler(n),
    };
    const r = await rodarLab(["/x/amostra-trem.ogg"], params, semChecagem);
    gravarSaidas(join(dirLab, "saidas"), r, r.historias[0]);
    const dir = join(dirLab, "saidas", "amostra-trem");
    const original = readFileSync(join(dir, "ia.json"), "utf8");

    const iaMd = readFileSync(join(dir, "ia.md"), "utf8");
    writeFileSync(
      join(dir, "editado.md"),
      iaMd.replace(" Por isso, até hoje fico emocionado quando lembro.", ""),
    );
    gravarSaidas(
      join(dirLab, "saidas"),
      { ...r, geradaEm: "2030-01-01T00:00:00.000Z" },
      r.historias[0],
    );
    expect(readFileSync(join(dir, "ia.json"), "utf8")).toBe(original);

    mkdirSync(dirLab, { recursive: true });
    const { classificacao } = await executarComparacao(dir, {
      ia,
      ler,
      dirLab,
    });
    expect(classificacao.mudancas[0].categoria).toBe("invencao_removida");
    const aprendizados = readFileSync(join(dirLab, "aprendizados.md"), "utf8");
    expect(aprendizados).toContain("ESCAPE");
    expect(existsSync(join(dir, "comparacao.json"))).toBe(true);
  });
});
