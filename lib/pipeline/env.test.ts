import { describe, expect, it } from "vitest";
import { travarModoDev } from "./env";

describe("travarModoDev", () => {
  it("na nuvem, INNGEST_DEV definido ou sem chave de assinatura trava", () => {
    expect(() =>
      travarModoDev({
        VERCEL_ENV: "production",
        INNGEST_DEV: "1",
        INNGEST_SIGNING_KEY: "x",
      }),
    ).toThrow("INNGEST_DEV");
    expect(() => travarModoDev({ VERCEL_ENV: "preview" })).toThrow(
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
