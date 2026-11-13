import { describe, expect, it } from "vitest";
import { emailAcesso } from "./modelos";

const url = "https://app.ecoa-memorias.com.br/entrar";

describe("emailAcesso", () => {
  it("usa o nome do autor no assunto", () => {
    const e = emailAcesso({ autorNome: "Jair", urlEntrar: url });
    expect(e.assunto).toBe("O livro do Jair está pronto para começar");
    expect(e.html).toContain(`href="${url}"`);
    expect(e.texto).toContain(url);
  });

  it("sem nome do autor, usa o assunto genérico", () => {
    expect(emailAcesso({ autorNome: null, urlEntrar: url }).assunto).toBe(
      "Seu livro de memórias está pronto",
    );
    expect(emailAcesso({ autorNome: "  ", urlEntrar: url }).assunto).toBe(
      "Seu livro de memórias está pronto",
    );
  });

  it("escapa HTML no nome do autor", () => {
    const e = emailAcesso({
      autorNome: "<script>alert(1)</script>",
      urlEntrar: url,
    });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
  });

  it("não leva link mágico nem chave no corpo", () => {
    const e = emailAcesso({ autorNome: "Jair", urlEntrar: url });
    expect(e.html).not.toMatch(/token|sb_secret|re_/);
  });
});

describe("emailHistoriaPronta", () => {
  it("sem título nem trecho, só o apelido e o link (P42)", async () => {
    const { emailHistoriaPronta } = await import("./modelos");
    const e = emailHistoriaPronta({
      apelido: "Vô <Jair>",
      urlHistoria: "https://app.exemplo/livro/1/historias/2",
    });
    expect(e.assunto).toBe("Uma história do livro de Vô <Jair> ficou pronta");
    expect(e.html).toContain("Vô &lt;Jair&gt;");
    expect(e.html).toContain("https://app.exemplo/livro/1/historias/2");
    expect(e.texto).toContain("Ler a história");
  });
});

describe("emailDivisaoPronta", () => {
  it("sem título, só o apelido e o link (D8)", async () => {
    const { emailDivisaoPronta } = await import("./modelos");
    const e = emailDivisaoPronta({
      apelido: "Nelson",
      urlDivisao: "https://app.exemplo/livro/1/historias/2/dividir",
    });
    expect(e.assunto).toBe(
      "As histórias da conversa de Nelson estão prontas para conferir",
    );
    expect(e.html).toContain("/historias/2/dividir");
    expect(e.texto).toContain("Conferir as histórias");
  });
});
