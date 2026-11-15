import { describe, expect, it } from "vitest";
import {
  criarLimitador,
  digestSeguro,
  rotaSegura,
  tipoDoErro,
} from "./erros-servidor";

describe("rotaSegura", () => {
  it("tira o /app e o arquivo, mantém o padrão com [param]", () => {
    expect(rotaSegura("/app/a/[token]/page")).toBe("/a/[token]");
    expect(rotaSegura("/app/livro/[id]/historias/[historiaId]/page")).toBe(
      "/livro/[id]/historias/[historiaId]",
    );
    expect(rotaSegura("/app/api/inngest/route")).toBe("/api/inngest");
  });
  it("aceita grupo de rotas", () => {
    expect(rotaSegura("/app/(dev)/styleguide/[tela]/page")).toBe(
      "/(dev)/styleguide/[tela]",
    );
  });
  it("valor que parece token ou URL não passa", () => {
    expect(rotaSegura("/a/v1_AbCdEfGhIjKlMnOpQrStUv?x=1")).toBe("desconhecida");
    expect(rotaSegura("/o/v1_AbCdEfGhIjKlMnOpQrStUv@email.com")).toBe(
      "desconhecida",
    );
    expect(rotaSegura(undefined)).toBe("desconhecida");
  });
});

describe("digest e tipo", () => {
  it("só aceita o formato do digest do Next", () => {
    expect(digestSeguro({ digest: "1234567890" })).toBe("1234567890");
    expect(digestSeguro({ digest: "texto com espaço e e-mail a@b.com" })).toBe(
      "",
    );
    expect(digestSeguro(new Error("x"))).toBe("");
  });
  it("tipo vem do nome da classe, nunca da mensagem", () => {
    expect(tipoDoErro(new TypeError("segredo"))).toBe("TypeError");
    expect(tipoDoErro("string solta")).toBe("Error");
  });
});

describe("limitador", () => {
  it("1 por rota por janela; outra rota passa", () => {
    let t = 0;
    const ok = criarLimitador(60_000, () => t);
    expect(ok("/a")).toBe(true);
    expect(ok("/a")).toBe(false);
    expect(ok("/b")).toBe(true);
    t = 60_000;
    expect(ok("/a")).toBe(true);
  });
});
