// O link /m (prompt 12) passa pelo proxy sem sessão: grava o cookie do aparelho só no caminho
// /m e sai sem cache, sem índice e sem Referer (o token circula fora do grupo).
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const token = "v1_mensagemAAAAAAAAAAAAA";

describe("proxy no /m", () => {
  it("cookie do aparelho com path=/m e cabeçalhos de página com token", async () => {
    const r = await proxy(
      new NextRequest(`https://app.ecoa-memorias.com.br/m/${token}`),
    );
    const cookie = r.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/ecoa_aparelho=[0-9a-f-]{36}/);
    expect(cookie).toMatch(/Path=\/m(;|$)/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(r.headers.get("cache-control")).toMatch(/no-store/);
    expect(r.headers.get("referrer-policy")).toBe("no-referrer");
    expect(r.headers.get("x-robots-tag")).toMatch(/noindex/);
    expect(r.status).toBe(200);
  });

  it("mantém o cookie que já existe", async () => {
    const atual = "12345678-1234-4234-8234-123456789012";
    const req = new NextRequest(`https://app.ecoa-memorias.com.br/m/${token}`, {
      headers: { cookie: `ecoa_aparelho=${atual}` },
    });
    const r = await proxy(req);
    expect(r.headers.get("set-cookie")).toBeNull();
  });

  it("o /f continua com o cookie no caminho /f", async () => {
    const r = await proxy(
      new NextRequest(`https://app.ecoa-memorias.com.br/f/${token}`),
    );
    expect(r.headers.get("set-cookie") ?? "").toMatch(/Path=\/f(;|$)/);
  });
});
