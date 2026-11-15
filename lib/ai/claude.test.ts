import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ClienteAnthropic,
  ErroIA,
  MAX_TOKENS_SEGUNDA_TENTATIVA,
} from "./claude";

type Resposta = { stop: string; parsed?: unknown };

/** SDK de mentira: devolve as respostas em ordem e guarda o que foi pedido. */
function sdk(respostas: Resposta[]) {
  const pedidos: { max_tokens: number }[] = [];
  const client = {
    messages: {
      stream(p: { max_tokens: number }) {
        pedidos.push(p);
        const r = respostas.shift();
        if (!r) throw new Error("sem resposta de exemplo");
        return {
          on() {
            return this;
          },
          request_id: "req_1",
          async finalMessage() {
            return {
              usage: { input_tokens: 10, output_tokens: 5 },
              stop_reason: r.stop,
              parsed_output: r.parsed ?? null,
            };
          },
        };
      },
    },
  };
  return { ia: new ClienteAnthropic(client as unknown as Anthropic), pedidos };
}

const chamada = {
  etapa: "editar" as const,
  modelo: "claude-opus-5-5",
  maxTokens: 1000,
  sistemaFixo: "regras",
  usuario: "fala",
  schema: z.object({ ok: z.boolean() }),
};

describe("ClienteAnthropic.gerar", () => {
  it("resposta cortada: tenta de novo com o dobro do teto e soma o uso das duas", async () => {
    const { ia, pedidos } = sdk([
      { stop: "max_tokens" },
      { stop: "end_turn", parsed: { ok: true } },
    ]);
    const r = await ia.gerar(chamada);
    expect(pedidos.map((p) => p.max_tokens)).toEqual([1000, 2000]);
    expect(r.tentativas).toBe(2);
    expect(r.uso).toMatchObject({ entrada: 20, saida: 10 });
    expect(r.dados).toEqual({ ok: true });
  });

  it("o teto da 2ª tentativa não passa do máximo nem encolhe", async () => {
    const { ia, pedidos } = sdk([
      { stop: "max_tokens" },
      { stop: "end_turn", parsed: { ok: true } },
    ]);
    await ia.gerar({ ...chamada, maxTokens: 48000 });
    expect(pedidos[1].max_tokens).toBe(MAX_TOKENS_SEGUNDA_TENTATIVA);
  });

  it("cortada duas vezes: falha com o código e as 2 tentativas", async () => {
    const { ia } = sdk([{ stop: "max_tokens" }, { stop: "max_tokens" }]);
    const e = await ia.gerar(chamada).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErroIA);
    expect(e).toMatchObject({ codigo: "cortada", tentativas: 2 });
    expect((e as ErroIA).uso.saida).toBe(10);
  });

  it("recusa: para na 1ª tentativa", async () => {
    const { ia, pedidos } = sdk([{ stop: "refusal" }]);
    const e = await ia.gerar(chamada).catch((x: unknown) => x);
    expect(e).toMatchObject({ codigo: "recusa", tentativas: 1 });
    expect(pedidos).toHaveLength(1);
  });

  it("validação recusada duas vezes: json_invalido, sem mudar o teto", async () => {
    const { ia, pedidos } = sdk([
      { stop: "end_turn", parsed: { ok: false } },
      { stop: "end_turn", parsed: { ok: false } },
    ]);
    const e = await ia
      .gerar({ ...chamada, validar: (d) => (d.ok ? null : "não serviu") })
      .catch((x: unknown) => x);
    expect(e).toMatchObject({ codigo: "json_invalido", tentativas: 2 });
    expect(pedidos.map((p) => p.max_tokens)).toEqual([1000, 1000]);
  });
});
