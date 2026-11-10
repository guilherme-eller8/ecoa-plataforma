import { describe, expect, it } from "vitest";
import { decidirRota } from "./rotas";

const semSessao = { temSessao: false, ehAdmin: false };
const membro = { temSessao: true, ehAdmin: false };
const admin = { temSessao: true, ehAdmin: true };

describe("decidirRota", () => {
  it.each(["/", "/livro/123", "/admin", "/admin/x"])(
    "sem sessão, %s vai para /entrar",
    (caminho) => {
      expect(decidirRota(caminho, semSessao)).toEqual({
        tipo: "redirect",
        destino: "/entrar",
      });
    },
  );

  it("com sessão, /entrar vai para /", () => {
    expect(decidirRota("/entrar", membro)).toEqual({
      tipo: "redirect",
      destino: "/",
    });
  });

  it("quem não é admin recebe 404 em /admin", () => {
    expect(decidirRota("/admin", membro)).toEqual({ tipo: "nao_encontrado" });
  });

  it.each([
    ["/entrar", semSessao],
    ["/auth/confirmar", semSessao],
    ["/auth/callback", semSessao],
    ["/styleguide/entrar", semSessao],
    ["/livro/123", membro],
    ["/admin", admin],
    ["/livros-antigos", semSessao],
    ["/administracao", membro],
  ] as const)("%s segue", (caminho, sessao) => {
    expect(decidirRota(caminho, sessao)).toBeNull();
  });
});
