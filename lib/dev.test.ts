import { describe, expect, it } from "vitest";
import { styleguideLiberado } from "./dev";

describe("styleguideLiberado", () => {
  it("libera em desenvolvimento e em teste", () => {
    expect(styleguideLiberado({ NODE_ENV: "development" })).toBe(true);
    expect(styleguideLiberado({ NODE_ENV: "test" })).toBe(true);
  });
  it("bloqueia em produção", () => {
    expect(styleguideLiberado({ NODE_ENV: "production" })).toBe(false);
  });
  it("libera em produção só com ECOA_STYLEGUIDE=1 (gate de design)", () => {
    expect(
      styleguideLiberado({ NODE_ENV: "production", ECOA_STYLEGUIDE: "1" }),
    ).toBe(true);
    expect(
      styleguideLiberado({ NODE_ENV: "production", ECOA_STYLEGUIDE: "0" }),
    ).toBe(false);
  });
});
