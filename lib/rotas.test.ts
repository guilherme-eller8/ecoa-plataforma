import { describe, expect, it } from "vitest";
import { CABECALHOS_PRIVADOS, decidirRota, ehPaginaComToken } from "./rotas";

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

describe("páginas com token (prompt 11)", () => {
  it.each(["/convite/v1_abc", "/o/v1_abc", "/resumo/sair/m/v1_abc"])(
    "%s abre sem login e sai sem cache, índice nem Referer",
    (caminho) => {
      expect(decidirRota(caminho, semSessao)).toBeNull();
      expect(ehPaginaComToken(caminho)).toBe(true);
    },
  );
  it("o resto não ganha os cabeçalhos", () => {
    expect(ehPaginaComToken("/livro/1")).toBe(false);
    expect(ehPaginaComToken("/ouvir")).toBe(false);
    expect(CABECALHOS_PRIVADOS["Cache-Control"]).toBe("private, no-store");
  });
});
