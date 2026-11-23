import { describe, expect, it } from "vitest";
import { estadoDaTelaConvite, type DadosDoConvite } from "./estado";

type Pendente = Extract<DadosDoConvite, { estado: "pendente" }>;
const base: Pendente = {
  estado: "pendente",
  conviteId: "c1",
  livroId: "l1",
  autor: "Jair",
  quem: "Ana",
  nome: "Maria",
  email: null,
  trocasRestantes: 3,
  eDono: false,
};
const com = (x: Partial<Pendente>): Pendente => ({
  ...base,
  ...x,
});

describe("estado da tela de convite (7 estados)", () => {
  it("inválido", () => {
    expect(estadoDaTelaConvite({ estado: "invalido" }, null)).toEqual({
      tipo: "invalido",
    });
    expect(estadoDaTelaConvite({ estado: "invalido" }, "a@b.com").tipo).toBe(
      "invalido",
    );
  });

  it("sem sessão, pelo nome, sem e-mail: pedir_email", () => {
    expect(estadoDaTelaConvite(com({}), null)).toEqual({
      tipo: "pedir_email",
      nome: "Maria",
      quem: "Ana",
      autor: "Jair",
    });
  });

  it("sem sessão, e-mail definido, aparelho dono: entrar (mascarado)", () => {
    const e = estadoDaTelaConvite(
      com({ email: "beatriz@gmail.com", eDono: true }),
      null,
    );
    expect(e).toEqual({
      tipo: "entrar",
      nome: "Maria",
      emailMascarado: "b•••@gmail.com",
      podeCorrigir: true,
    });
    expect(
      estadoDaTelaConvite(
        com({ email: "beatriz@gmail.com", eDono: true, trocasRestantes: 0 }),
        null,
      ),
    ).toMatchObject({ podeCorrigir: false });
  });

  it("sem sessão, e-mail definido, outro aparelho: em_uso", () => {
    expect(
      estadoDaTelaConvite(com({ email: "beatriz@gmail.com" }), null),
    ).toEqual({ tipo: "em_uso", quem: "Ana" });
  });

  it("sem sessão, convite antigo por e-mail: entrar_antigo", () => {
    expect(
      estadoDaTelaConvite(com({ nome: null, email: "bia@x.com" }), null),
    ).toEqual({ tipo: "entrar_antigo", quem: "Ana", autor: "Jair" });
  });

  it("com sessão: aceitar quando sem e-mail, com o próprio e-mail ou como dono com correção", () => {
    expect(estadoDaTelaConvite(com({}), "Fulana@Gmail.com")).toEqual({
      tipo: "aceitar",
      quem: "Ana",
      autor: "Jair",
      email: "fulana@gmail.com",
    });
    expect(
      estadoDaTelaConvite(
        com({ email: "fulana@gmail.com" }),
        "fulana@gmail.com",
      ).tipo,
    ).toBe("aceitar");
    expect(
      estadoDaTelaConvite(
        com({ email: "errado@gmail.com", eDono: true }),
        "fulana@gmail.com",
      ).tipo,
    ).toBe("aceitar");
    expect(
      estadoDaTelaConvite(
        com({ nome: null, email: "fulana@gmail.com" }),
        "fulana@gmail.com",
      ).tipo,
    ).toBe("aceitar");
  });

  it("com sessão e convite de outro e-mail, sem ser dono (ou dono sem correção): outro_email", () => {
    expect(
      estadoDaTelaConvite(com({ email: "beatriz@gmail.com" }), "eu@gmail.com"),
    ).toEqual({ tipo: "outro_email", emailMascarado: "b•••@gmail.com" });
    expect(
      estadoDaTelaConvite(
        com({ email: "beatriz@gmail.com", eDono: true, trocasRestantes: 0 }),
        "eu@gmail.com",
      ).tipo,
    ).toBe("outro_email");
    expect(
      estadoDaTelaConvite(
        com({ nome: null, email: "beatriz@gmail.com" }),
        "eu@gmail.com",
      ).tipo,
    ).toBe("outro_email");
  });

  it("o e-mail do convite nunca vai cru para o cliente", () => {
    const cru = "segredo.da.maria@gmail.com";
    const casos: [Partial<Pendente>, string | null][] = [
      [{ email: cru, eDono: true }, null],
      [{ email: cru }, null],
      [{ email: cru, nome: null }, null],
      [{ email: cru }, "outra@gmail.com"],
      [{ email: cru, eDono: true }, "outra@gmail.com"],
    ];
    for (const [x, sessao] of casos) {
      expect(JSON.stringify(estadoDaTelaConvite(com(x), sessao))).not.toContain(
        cru,
      );
    }
  });
});
