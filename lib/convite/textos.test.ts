import { describe, expect, it } from "vitest";
import {
  mascararEmail,
  mensagemConviteNome,
  nomeDoConvite,
  nomeSeguro,
  primeiroNome,
} from "./textos";

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

describe("nomeDoConvite", () => {
  it("aceita nome com acento, hífen e apóstrofo; junta espaços", () => {
    expect(nomeDoConvite("  Maria  D'Ávila ")).toBe("Maria D'Ávila");
  });
  it("rejeita o que nomeSeguro mudaria", () => {
    expect(nomeDoConvite("Maria 2")).toBeNull();
    expect(nomeDoConvite("http://x.co")).toBeNull();
    expect(nomeDoConvite("a".repeat(31))).toBeNull();
    expect(nomeDoConvite("   ")).toBeNull();
    expect(nomeDoConvite(null)).toBeNull();
  });
  it("aceita 30 letras", () => {
    expect(nomeDoConvite("a".repeat(30))).toHaveLength(30);
  });
});

describe("mensagemConviteNome", () => {
  it("chama pelo nome, traz o link e pede para não repassar", () => {
    const m = mensagemConviteNome({
      nome: "Maria",
      autor: "Jair",
      link: "https://x/convite/1",
    });
    expect(m).toContain("Oi, Maria!");
    expect(m).toContain("livro de memórias de Jair");
    expect(m).toContain("Gmail: https://x/convite/1");
    expect(m).toContain("não repasse no grupo");
  });
});
