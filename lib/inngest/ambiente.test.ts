import { describe, expect, it } from "vitest";
import { inngestAtendeAqui } from "./ambiente";

describe("quem atende o Inngest", () => {
  it("preview da Vercel recusa (não pode virar o app de produção)", () => {
    expect(inngestAtendeAqui({ VERCEL_ENV: "preview" })).toBe(false);
  });

  it("produção e máquina local atendem", () => {
    expect(inngestAtendeAqui({ VERCEL_ENV: "production" })).toBe(true);
    expect(inngestAtendeAqui({ VERCEL_ENV: "development" })).toBe(true);
    expect(inngestAtendeAqui({})).toBe(true);
  });
});
