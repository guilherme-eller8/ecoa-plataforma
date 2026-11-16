import { describe, expect, it } from "vitest";
import { ehRepeticao } from "./repeticao";

describe("erro do Resend que é repetição, não falha", () => {
  it("mesma chave com outro texto ou em andamento é repetição", () => {
    expect(ehRepeticao("invalid_idempotent_request")).toBe(true);
    expect(ehRepeticao("concurrent_idempotent_requests")).toBe(true);
  });

  it("o resto continua sendo falha", () => {
    expect(ehRepeticao("invalid_idempotency_key")).toBe(false);
    expect(ehRepeticao("validation_error")).toBe(false);
    expect(ehRepeticao(undefined)).toBe(false);
    expect(ehRepeticao(null)).toBe(false);
  });
});
