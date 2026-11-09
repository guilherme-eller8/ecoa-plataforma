import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClienteAdmin } from "@/lib/supabase/admin";
import { inicioDoDiaBrasilia, registrarEvento } from "./eventos";

const ANA = "11111111-1111-4111-8111-111111111111";
const LIVRO = "22222222-2222-4222-8222-222222222222";

/** Cliente falso que imita o encadeamento do supabase-js e grava o que recebeu. */
function clienteFalso(
  opcoes: { existentes?: number; erroInsert?: string } = {},
) {
  const inseridos: unknown[] = [];
  const filtros: [string, unknown][] = [];
  const busca = {
    eq: (col: string, v: unknown) => (filtros.push([col, v]), busca),
    is: (col: string, v: unknown) => (filtros.push([col, v]), busca),
    gte: (col: string, v: unknown) => (filtros.push([col, v]), busca),
    then: (resolver: (r: { count: number; error: null }) => void) =>
      resolver({ count: opcoes.existentes ?? 0, error: null }),
  };
  const cliente = {
    from: () => ({
      select: () => busca,
      insert: async (linha: unknown) => {
        inseridos.push(linha);
        return {
          error: opcoes.erroInsert ? { message: opcoes.erroInsert } : null,
        };
      },
    }),
  } as unknown as ClienteAdmin;
  return { cliente, inseridos, filtros };
}

afterEach(() => vi.restoreAllMocks());

describe("registrarEvento", () => {
  it("grava nas colunas certas", async () => {
    const { cliente, inseridos } = clienteFalso();
    const r = await registrarEvento(
      { quem: ANA, papel: "responsavel", acao: "entrou", livro: LIVRO },
      {},
      cliente,
    );
    expect(r).toEqual({ ok: true });
    expect(inseridos).toEqual([
      {
        ator_id: ANA,
        ator_tipo: "responsavel",
        acao: "entrou",
        book_id: LIVRO,
        detalhes: {},
      },
    ]);
  });

  it("não grava ação fora da lista", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { cliente, inseridos } = clienteFalso();
    const r = await registrarEvento(
      {
        quem: ANA,
        papel: "responsavel",
        acao: "apagou_tudo" as "entrou",
        livro: LIVRO,
      },
      {},
      cliente,
    );
    expect(r).toEqual({ ok: false });
    expect(inseridos).toEqual([]);
  });

  it("com umaVezPorDia, não grava se já houver evento hoje", async () => {
    const { cliente, inseridos, filtros } = clienteFalso({ existentes: 1 });
    const r = await registrarEvento(
      { quem: ANA, papel: "responsavel", acao: "entrou", livro: LIVRO },
      { umaVezPorDia: true },
      cliente,
    );
    expect(r).toEqual({ ok: true });
    expect(inseridos).toEqual([]);
    expect(filtros).toEqual(
      expect.arrayContaining([
        ["acao", "entrou"],
        ["ator_id", ANA],
        ["book_id", LIVRO],
      ]),
    );
  });

  it("falha do banco não lança e não vaza dados pessoais no log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { cliente } = clienteFalso({ erroInsert: "conexão caiu" });
    const r = await registrarEvento(
      { quem: ANA, papel: "admin", acao: "plano_ativado", livro: LIVRO },
      {},
      cliente,
    );
    expect(r).toEqual({ ok: false });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/@/);
  });
});

describe("inicioDoDiaBrasilia", () => {
  it("às 01:00 UTC ainda é o dia anterior em Brasília", () => {
    expect(
      inicioDoDiaBrasilia(new Date("2026-12-25T01:00:00Z")).toISOString(),
    ).toBe("2026-12-24T03:00:00.000Z");
  });

  it("às 15:00 UTC é o mesmo dia", () => {
    expect(
      inicioDoDiaBrasilia(new Date("2026-12-25T15:00:00Z")).toISOString(),
    ).toBe("2026-12-25T03:00:00.000Z");
  });
});
