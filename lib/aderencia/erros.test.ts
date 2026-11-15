import { describe, expect, it } from "vitest";
import { errosPorRota, jobsQueFalharam, type EventoDeErro } from "./erros";

const AGORA = new Date("2026-11-15T15:00:00.000Z");
const h = (n: number) => new Date(AGORA.getTime() - n * 3600_000).toISOString();
const erro = (rota: string, horas: number, tipo = "Error"): EventoDeErro => ({
  criado_em: h(horas),
  book_id: null,
  acao: "erro_servidor",
  detalhes: { rota, tipo },
});

describe("errosPorRota", () => {
  it("conta 24 h e 7 dias por rota, mais errada primeiro", () => {
    const r = errosPorRota(
      [
        erro("/a/[token]", 1),
        erro("/a/[token]", 30),
        erro("/f/[token]", 2),
        erro("/f/[token]", 3, "TypeError"),
        erro("/o/[token]", 24 * 8),
      ],
      AGORA,
    );
    expect(r.map((x) => [x.rota, x.ultimas24h, x.ultimos7d])).toEqual([
      ["/f/[token]", 2, 2],
      ["/a/[token]", 1, 2],
      ["/o/[token]", 0, 0],
    ]);
  });
  it("ignora outras ações e detalhes fora do formato", () => {
    const r = errosPorRota(
      [
        { criado_em: h(1), book_id: null, acao: "entrou", detalhes: {} },
        {
          criado_em: h(1),
          book_id: null,
          acao: "erro_servidor",
          detalhes: null,
        },
      ],
      AGORA,
    );
    expect(r).toHaveLength(1);
    expect(r[0].rota).toBe("desconhecida");
  });
});

describe("jobsQueFalharam", () => {
  it("lista só job_falhou, do mais recente para o mais antigo", () => {
    const j = jobsQueFalharam([
      {
        criado_em: h(5),
        book_id: "b1",
        acao: "job_falhou",
        detalhes: { funcao: "ecoa-plataforma-propor", run_id: "R1" },
      },
      {
        criado_em: h(1),
        book_id: null,
        acao: "job_falhou",
        detalhes: { funcao: "ecoa-plataforma-resumo-semanal", run_id: "R2" },
      },
      erro("/a/[token]", 1),
    ]);
    expect(j.map((x) => x.runId)).toEqual(["R2", "R1"]);
    expect(j[1].livroId).toBe("b1");
  });
});
