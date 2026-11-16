import { describe, expect, it } from "vitest";
import { servirInngest, travarModoDev } from "./env";

describe("travarModoDev", () => {
  it("na nuvem, INNGEST_DEV definido ou sem chave de assinatura trava", () => {
    expect(() =>
      travarModoDev({
        VERCEL_ENV: "production",
        INNGEST_DEV: "1",
        INNGEST_SIGNING_KEY: "x",
      }),
    ).toThrow("INNGEST_DEV");
    expect(() => travarModoDev({ VERCEL_ENV: "production" })).toThrow(
      "INNGEST_SIGNING_KEY",
    );
  });
  it("no computador, deixa rodar", () => {
    expect(() => travarModoDev({ INNGEST_DEV: "1" })).not.toThrow();
    expect(() =>
      travarModoDev({ VERCEL_ENV: "production", INNGEST_SIGNING_KEY: "x" }),
    ).not.toThrow();
  });
});

describe("servirInngest (T56)", () => {
  it("a prévia nunca serve as funções; produção e computador servem", () => {
    expect(servirInngest({ VERCEL_ENV: "preview" })).toBe(false);
    expect(servirInngest({ VERCEL_ENV: "production" })).toBe(true);
    expect(servirInngest({})).toBe(true);
  });
  it("a prévia sem chave de assinatura não derruba o app (a rota já está fora)", () => {
    expect(() => travarModoDev({ VERCEL_ENV: "preview" })).not.toThrow();
  });
});
