import { describe, expect, it } from "vitest";
import { emailAcesso, emailConvite, emailResumo } from "./modelos";

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

describe("e-mails do prompt 11", () => {
  it("convite: assunto fixo, nomes escapados, sem título de história", () => {
    const e = emailConvite({
      quem: "Ana",
      apelido: "Jair",
      urlConvite: "https://x/convite/v1_abc",
    });
    expect(e.assunto).toBe("Convite para ajudar num livro de memórias");
    expect(e.texto).toContain("Ana chamou você para ajudar a fazer o livro de memórias de Jair");
    expect(e.html).toContain('href="https://x/convite/v1_abc"');
    const semNome = emailConvite({ quem: "", apelido: "", urlConvite: "u" });
    expect(semNome.assunto).toBe("Convite para ajudar num livro de memórias");
    expect(semNome.texto).toContain("Uma pessoa da sua família");
  });

  it("resumo: só números e descadastro de 1 clique", () => {
    const e = emailResumo({
      apelido: "Jair",
      historiasNovas: 2,
      perguntasEsperando: 1,
      paginasEstimadas: 34,
      urlLivro: "https://x/livro/1",
      urlSair: "https://x/resumo/sair/m/t",
    });
    expect(e.assunto).toBe("Esta semana no livro de Jair");
    expect(e.texto).toContain(
      "2 histórias novas · 1 pergunta esperando · ~34 páginas",
    );
    expect(e.cabecalhos).toEqual({
      "List-Unsubscribe": "<https://x/resumo/sair/m/t>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(e.html).toContain('href="https://x/resumo/sair/m/t"');
  });
});
