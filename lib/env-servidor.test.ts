import { describe, expect, it } from "vitest";
import { urlDoApp } from "./env-servidor";

describe("urlDoApp", () => {
  it("usa APP_URL quando existe, sem barra no fim", () => {
    expect(
      urlDoApp({
        APP_URL: "https://preview.exemplo.com/",
        VERCEL_ENV: "production",
      }),
    ).toBe("https://preview.exemplo.com");
  });

  it("em produção, usa o domínio oficial e nunca a URL do branch", () => {
    expect(
      urlDoApp({
        VERCEL_ENV: "production",
        VERCEL_BRANCH_URL: "x-git-main.vercel.app",
      }),
    ).toBe("https://app.ecoa-memorias.com.br");
  });

  it("no preview, usa a URL do branch", () => {
    expect(
      urlDoApp({
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "x-git-feat.vercel.app",
      }),
    ).toBe("https://x-git-feat.vercel.app");
  });

  it("sem nada, usa localhost", () => {
    expect(urlDoApp({})).toBe("http://localhost:3000");
  });
});
