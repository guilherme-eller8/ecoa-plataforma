import { describe, expect, it } from "vitest";
import { codigoDoErro, fraseDoErro } from "./erros-banco";

describe("erros do banco", () => {
  it("traduz o código nosso", () => {
    expect(codigoDoErro({ message: "sem_enquete" })).toBe("sem_enquete");
    expect(fraseDoErro({ message: "sem_enquete" })).toBe(
      "A enquete já terminou.",
    );
  });

  it("usa a frase de reserva pelo SQLSTATE e nunca o texto cru", () => {
    const cru = {
      message: 'duplicate key value violates unique constraint "x"',
      code: "23505",
    };
    expect(codigoDoErro(cru)).toBeNull();
    expect(fraseDoErro(cru)).toBe("Isso já foi feito. Atualize a tela.");
    expect(fraseDoErro({ message: "qualquer coisa", code: "XX000" })).toBe(
      "Não deu certo agora. Tente de novo.",
    );
    expect(fraseDoErro(null)).toBe("Não deu certo agora. Tente de novo.");
  });
});
