import { describe, expect, it } from "vitest";
import { MENSAGEM_LINK, prepararPedidoDeLink } from "./pedir-link";

const form = (email: string) => {
  const f = new FormData();
  f.set("email", email);
  return f;
};

describe("prepararPedidoDeLink", () => {
  it("e-mail inválido pede para conferir e não envia nada", () => {
    expect(prepararPedidoDeLink(form("ana@"))).toEqual({
      email: null,
      resultado: { ok: false, mensagem: "Confira o e-mail digitado." },
    });
  });

  it("qualquer e-mail válido recebe a mesma resposta", () => {
    const comLivro = prepararPedidoDeLink(form("  Ana@Exemplo.com "));
    const semLivro = prepararPedidoDeLink(form("ninguem@exemplo.com"));
    expect(comLivro.resultado).toEqual({ ok: true, mensagem: MENSAGEM_LINK });
    expect(semLivro.resultado).toEqual(comLivro.resultado);
    expect(comLivro.email).toBe("ana@exemplo.com");
  });
});
