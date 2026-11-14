import { describe, expect, it } from "vitest";
import { envLinks } from "./env-links";
import { hashDoToken, tokenDoLink, tokenDoResumoConfere } from "./links";

const env = envLinks({
  LINKS_VERSAO_ATUAL: "2",
  LINKS_SEGREDO_V1: "a".repeat(32),
  LINKS_SEGREDO_V2: "b".repeat(32),
});
const id = "0b6c2a8e-1111-4222-8333-444455556666";

describe("tokens dos links", () => {
  it("é estável, tem 25 caracteres e nenhum ponto", () => {
    const t = tokenDoLink("familia", id, 1, env);
    expect(t).toBe(tokenDoLink("familia", id, 1, env));
    expect(t).toHaveLength(25);
    expect(t.startsWith("v1_")).toBe(true);
    expect(t).not.toContain(".");
    expect(t).toMatch(/^v1_[A-Za-z0-9_-]{22}$/);
  });

  it("muda com o tipo, o id e a versão", () => {
    const t = tokenDoLink("familia", id, 1, env);
    expect(tokenDoLink("autor", id, 1, env)).not.toBe(t);
    expect(tokenDoLink("familia", id.replace("6666", "6667"), 1, env)).not.toBe(
      t,
    );
    expect(tokenDoLink("familia", id, 2, env)).not.toBe(t);
  });

  it("o hash é o sha256 em hexadecimal (o mesmo do banco)", () => {
    // sha256("abc"), vetor conhecido
    expect(hashDoToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("exige segredo de todas as versões até a atual", () => {
    expect(() =>
      envLinks({ LINKS_VERSAO_ATUAL: "2", LINKS_SEGREDO_V2: "b".repeat(32) }),
    ).toThrow();
    expect(() => envLinks({ LINKS_SEGREDO_V1: "curto" })).toThrow();
    expect(envLinks({ LINKS_SEGREDO_V1: "a".repeat(32) }).versaoAtual).toBe(1);
  });

  it("versão sem segredo não gera token", () => {
    expect(() => tokenDoLink("familia", id, 3, env)).toThrow();
  });
});

describe("links do prompt 11", () => {
  it("convite, compartilhar e resumo têm tokens diferentes para o mesmo id", () => {
    const t = new Set(
      (["familia", "autor", "convite", "compartilhar", "resumo"] as const).map(
        (tipo) => tokenDoLink(tipo, id, 1, env),
      ),
    );
    expect(t.size).toBe(5);
  });

  it("o descadastro do resumo confere o token em tempo constante", () => {
    const token = tokenDoLink("resumo", id, 2, env);
    expect(tokenDoResumoConfere(id, token, env)).toBe(true);
    expect(
      tokenDoResumoConfere(id, tokenDoLink("resumo", id, 1, env), env),
    ).toBe(true);
    expect(
      tokenDoResumoConfere(id, tokenDoLink("autor", id, 2, env), env),
    ).toBe(false);
    expect(tokenDoResumoConfere(id, "v9_" + "a".repeat(22), env)).toBe(false);
    expect(tokenDoResumoConfere(id, "lixo", env)).toBe(false);
  });
});
