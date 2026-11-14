import { describe, expect, it } from "vitest";
import { mascararEmail, nomeSeguro, primeiroNome } from "./textos";

describe("mascararEmail", () => {
  it("mostra só a 1ª letra e o domínio", () => {
    expect(mascararEmail("Beatriz.Souza@Gmail.com")).toBe("b•••@gmail.com");
  });
  it("não quebra com e-mail estranho", () => {
    expect(mascararEmail("semarroba")).toBe("•••");
  });
});

describe("nomeSeguro", () => {
  it("mantém acentos, hífen e apóstrofo", () => {
    expect(nomeSeguro("  João  D'Ávila-Souza ")).toBe("João D'Ávila-Souza");
  });
  it("tira links, números e quebras", () => {
    expect(nomeSeguro("Ana\nclique em http://x.co/1")).toBe(
      "Ana clique em http x co",
    );
    expect(nomeSeguro("Pix 123")).toBe("Pix");
  });
  it("corta em 30 caracteres", () => {
    expect(nomeSeguro("a".repeat(50))).toHaveLength(30);
  });
  it("vazio ou nulo vira vazio", () => {
    expect(nomeSeguro(null)).toBe("");
    expect(primeiroNome("  ")).toBeNull();
    expect(primeiroNome("Guilherme Eller")).toBe("Guilherme");
  });
});
