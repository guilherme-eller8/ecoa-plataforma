import { describe, expect, it } from "vitest";
import {
  PREMISSA_HISTORIAS_POR_LIVRO,
  PREMISSA_MIN_AUDIO_POR_HISTORIA,
} from "@/lib/config";
import {
  falhasPorCodigo,
  faixasCompletas,
  gastoPorSemana,
  projetarPorHabito,
  resumoDeCusto,
  rotulosDasFaixas,
  segundaDe,
  taxa,
  type LinhaUso,
} from "./custo";

const linha = (p: Partial<LinhaUso>): LinhaUso => ({
  dia: "2026-12-10",
  etapa: "editar",
  modelo: "m",
  chamadas: 1,
  falhas: 0,
  repetidas: 0,
  custo_usd: 0,
  custo_falhas_usd: 0,
  minutos_audio: 0,
  tokens_entrada: 0,
  tokens_saida: 0,
  tokens_cache_lido: 0,
  tokens_cache_gravado: 0,
  ...p,
});

describe("taxa", () => {
  it("abaixo da amostra mínima mostra só a contagem", () => {
    expect(taxa(2, 3)).toEqual({ n: 2, de: 3, fracao: null });
    expect(taxa(3, 5)).toEqual({ n: 3, de: 5, fracao: 0.6 });
    expect(taxa(0, 0, 0).fracao).toBeNull();
  });
});

describe("resumoDeCusto", () => {
  const linhas = [
    linha({ etapa: "transcrever", custo_usd: 0.1, minutos_audio: 10 }),
    linha({
      etapa: "editar",
      custo_usd: 0.6,
      custo_falhas_usd: 0.2,
      falhas: 1,
      repetidas: 2,
      tokens_entrada: 100,
      tokens_cache_lido: 300,
      tokens_cache_gravado: 100,
    }),
    linha({ etapa: "tamanho", custo_usd: 0.3 }),
  ];
  it("custo por minuto já com trocas e falhas; perda sobre o gasto; repetidas só contadas", () => {
    const r = resumoDeCusto(linhas, 4);
    expect(r.gastoUSD).toBeCloseTo(1);
    expect(r.minutos).toBe(10);
    expect(r.porMinutoUSD).toBeCloseTo(0.1);
    expect(r.porHistoriaUSD).toBeCloseTo(0.25);
    expect(r.perda.usd).toBeCloseTo(0.2);
    expect(r.perda.fracao).toBeCloseTo(0.2);
    expect(r.repetidas).toBe(2);
    expect(r.trocasTamanhoUSD).toBeCloseTo(0.3);
    expect(r.cache).toBeCloseTo(0.6);
  });
  it("sem dados, nada dividido por zero", () => {
    const r = resumoDeCusto([], 0);
    expect(r).toMatchObject({
      gastoUSD: 0,
      porMinutoUSD: null,
      porHistoriaUSD: null,
      cache: null,
      perda: { usd: 0, fracao: null },
    });
  });
});

describe("gastoPorSemana", () => {
  it("segunda-feira da semana, inclusive no domingo", () => {
    expect(segundaDe("2026-12-14")).toBe("2026-12-14"); // segunda
    expect(segundaDe("2026-12-20")).toBe("2026-12-14"); // domingo
    expect(segundaDe("2026-12-13")).toBe("2026-12-07");
  });
  it("agrupa por semana e grupo de etapa, com semanas vazias zeradas", () => {
    const s = gastoPorSemana(
      [
        linha({ dia: "2026-12-15", etapa: "transcrever", custo_usd: 0.1 }),
        linha({ dia: "2026-12-16", etapa: "verificar", custo_usd: 0.2 }),
        linha({ dia: "2026-12-08", etapa: "revisar", custo_usd: 0.3 }),
        linha({ dia: "2026-11-01", etapa: "editar", custo_usd: 9 }), // fora da janela
      ],
      "2026-12-17",
      3,
    );
    expect(s.map((x) => x.semana)).toEqual([
      "2026-11-30",
      "2026-12-07",
      "2026-12-14",
    ]);
    expect(s[0].escrita).toBe(0);
    expect(s[1].pedidos).toBeCloseTo(0.3);
    expect(s[2]).toMatchObject({ transcricao: 0.1, escrita: 0.2 });
  });
});

describe("projetarPorHabito", () => {
  it("cada troca de tamanho refaz só edição e verificação, sem as falhas", () => {
    const p = projetarPorHabito([
      linha({ etapa: "transcrever", custo_usd: 0.07, minutos_audio: 10 }),
      linha({ etapa: "estruturar", custo_usd: 0.03 }),
      linha({ etapa: "editar", custo_usd: 0.25, custo_falhas_usd: 0.05 }),
      linha({ etapa: "verificar", custo_usd: 0.1 }),
    ])!;
    const min = PREMISSA_HISTORIAS_POR_LIVRO * PREMISSA_MIN_AUDIO_POR_HISTORIA;
    // fixo 0,01/min; por geração 0,03/min
    expect(p.map((x) => x.trocas)).toEqual([0, 0.5, 1, 2]);
    expect(p[0].livroUSD).toBeCloseTo(min * 0.04);
    expect(p[3].livroUSD).toBeCloseTo(min * (0.01 + 0.03 * 3));
  });
  it("sem minutos medidos, sem projeção", () => {
    expect(projetarPorHabito([linha({ custo_usd: 1 })])).toBeNull();
  });
});

describe("faixas da primeira palavra", () => {
  it("rótulos seguem os limites e as faixas vazias aparecem zeradas", () => {
    expect(rotulosDasFaixas([5, 20])).toEqual([
      "até 5 min",
      "5 a 20 min",
      "20 min ou mais",
    ]);
    const f = faixasCompletas(
      [{ faixa: 2, esperas: 1, p50_ms: 9, p95_ms: 9, paradas: 0 }],
      [5, 20],
    );
    expect(f.map((x) => x.esperas)).toEqual([0, 0, 1]);
    expect(f[0].p50_ms).toBeNull();
  });
});

describe("falhasPorCodigo", () => {
  it("conta por etapa e código, da mais frequente", () => {
    expect(
      falhasPorCodigo([
        { etapa: "editar", erro_codigo: "json_invalido" },
        { etapa: "transcrever", erro_codigo: "sem_fala" },
        { etapa: "editar", erro_codigo: "json_invalido" },
        { etapa: "editar", erro_codigo: null },
      ]),
    ).toEqual([
      { codigo: "json_invalido", etapa: "editar", vezes: 2 },
      { codigo: "sem_codigo", etapa: "editar", vezes: 1 },
      { codigo: "sem_fala", etapa: "transcrever", vezes: 1 },
    ]);
  });
});
