import { describe, expect, it } from "vitest";
import { adminsParaAvisar } from "./alerta";

const usuario = (i: number, admin = false) => ({
  id: `u${i}`,
  email: `u${i}@x.br`,
  app_metadata: admin ? { role: "admin" } : {},
});

describe("adminsParaAvisar (T56)", () => {
  it("lê todas as páginas: o admin da 3ª página não some", async () => {
    const paginas = [
      Array.from({ length: 1000 }, (_, i) => usuario(i, i === 5)),
      Array.from({ length: 1000 }, (_, i) => usuario(1000 + i)),
      [usuario(2000, true), usuario(2001)],
    ];
    const pedidas: number[] = [];
    const admins = await adminsParaAvisar(async (n) => {
      pedidas.push(n);
      return { users: paginas[n - 1] ?? [], erro: null };
    });
    expect(admins.map((a) => a.id)).toEqual(["u5", "u2000"]);
    expect(pedidas).toEqual([1, 2, 3]);
  });
  it("Auth falhou no meio: devolve o que achou, sem lançar", async () => {
    const admins = await adminsParaAvisar(async (n) =>
      n === 1
        ? {
            users: Array.from({ length: 1000 }, (_, i) => usuario(i, i === 0)),
            erro: null,
          }
        : { users: null, erro: "timeout" },
    );
    expect(admins.map((a) => a.id)).toEqual(["u0"]);
  });
});
