import { expect, test } from "@playwright/test";

// Prompt 11: telas com dados de exemplo (sem Supabase). O banco garante as regras; aqui se
// confere que a tela esconde o que não é de cada papel.

test.describe("Quem ajuda", () => {
  test("responsável vê Convidar, Remover e o convite pendente", async ({
    page,
  }) => {
    await page.goto("/styleguide/pessoas");
    await expect(
      page.getByRole("heading", { name: "Quem ajuda" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Convidar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remover" })).toBeVisible();
    await expect(page.getByText("Ainda não abriu o convite")).toBeVisible();
    await expect(
      page.getByText("carla.souza@gmail.com, ainda não entrou"),
    ).toBeVisible();
  });

  test("convidar pede só o nome e a folha manda pelo WhatsApp", async ({
    page,
  }) => {
    await page.goto("/styleguide/pessoas");
    await page.getByRole("button", { name: "Convidar" }).click();
    const folha = page.getByRole("dialog", { name: "Convidar" });
    await expect(folha.getByRole("textbox")).toHaveCount(1);
    await folha.getByLabel("Nome de quem vai ajudar").fill("Tia Lu");
    await folha.getByRole("button", { name: "Criar convite" }).click();
    const pronto = page.getByRole("dialog", { name: "Convite para Tia Lu" });
    const whats = pronto.getByRole("link", { name: "Mandar no WhatsApp" });
    await expect(whats).toBeVisible();
    await expect(whats).toHaveAttribute("href", /wa\.me/);
    await expect(
      pronto.getByRole("button", { name: "Copiar mensagem" }),
    ).toBeVisible();
  });

  test("remover oferece trocar os links do autor e da família", async ({
    page,
  }) => {
    await page.goto("/styleguide/pessoas");
    await page.getByRole("button", { name: "Remover" }).first().click();
    await page
      .getByRole("dialog", { name: "Remover" })
      .getByRole("button", { name: "Remover" })
      .click();
    await expect(page.getByText(/Trocar os dois agora\?/)).toBeVisible();
  });

  test("co-facilitadora vê Quem ajuda sem Convidar, com Sair", async ({
    page,
  }) => {
    await page.goto("/styleguide/pessoas-cofacilitador");
    await expect(
      page.getByRole("heading", { name: "Quem ajuda" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Convidar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remover" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Sair do livro" }),
    ).toBeVisible();
  });

  test("estado vazio: uma frase e Convidar", async ({ page }) => {
    await page.goto("/styleguide/pessoas-vazia");
    await expect(
      page.getByText("Só você por enquanto.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Convidar" })).toBeVisible();
  });
});

test.describe("Convite", () => {
  test("pelo nome, sem sessão: pede o e-mail e depois manda entrar", async ({
    page,
  }) => {
    await page.goto("/styleguide/convite");
    await expect(
      page.getByRole("heading", { name: "Oi, Rafael!" }),
    ).toBeVisible();
    await expect(
      page.getByText("É o e-mail que você usa no celular, sem +"),
    ).toBeVisible();
    await page.getByLabel("Seu e-mail do Google").fill("rafa@gmail.com");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(
      page.getByRole("heading", { name: "Pronto. Entre com r•••@gmail.com" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Entrar com Google" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Receber link por e-mail" }).click();
    await expect(page.getByText(/o link chega em instantes/)).toBeVisible();
  });

  test("e-mail definido neste aparelho: entrar ou corrigir", async ({
    page,
  }) => {
    await page.goto("/styleguide/convite-entrar");
    await page.getByRole("button", { name: "Corrigir o e-mail" }).click();
    await page.getByLabel("Seu e-mail do Google").fill("outro@gmail.com");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(
      page.getByText("Este convite já está com outra pessoa.", {
        exact: false,
      }),
    ).toBeVisible();
  });

  test("em uso em outro aparelho: pede um novo a quem convidou", async ({
    page,
  }) => {
    await page.goto("/styleguide/convite-em-uso");
    await expect(
      page.getByText("Se era para você, peça um novo a Guilherme."),
    ).toBeVisible();
  });

  test("com sessão: aceitar como o e-mail de quem entrou", async ({ page }) => {
    await page.goto("/styleguide/convite-aceitar");
    await expect(
      page.getByRole("button", { name: "Aceitar como rafael.souza@gmail.com" }),
    ).toBeVisible();
  });

  test("convite antigo, sem sessão: Entrar para aceitar", async ({ page }) => {
    await page.goto("/styleguide/convite-antigo");
    await expect(
      page.getByRole("link", { name: "Entrar para aceitar" }),
    ).toBeVisible();
  });

  test("com outro e-mail: mostra só o e-mail mascarado", async ({ page }) => {
    await page.goto("/styleguide/convite-outro-email");
    await expect(
      page.getByText("Este convite é para b•••@gmail.com"),
    ).toBeVisible();
  });

  test("passo Quem mais ajuda é o 4 de 4", async ({ page }) => {
    await page.goto("/styleguide/configurar-ajuda");
    await expect(page.getByText("Passo 4 de 4")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pular" })).toBeVisible();
  });
});

test.describe("Boas-vindas", () => {
  test("duas portas: gravar (principal) e a mensagem sem o autor saber", async ({
    page,
  }) => {
    await page.goto("/styleguide/bemvindo");
    await expect(
      page.getByRole("heading", {
        name: "Que bom ter você no livro de Vô Jair",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Gravar uma conversa com Vô Jair" }),
    ).toHaveAttribute("href", /\/historias\/gravar\?bemvindo=1$/);
    await expect(
      page.getByRole("button", { name: "Deixar sua mensagem" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Sem que Vô Jair saiba: só vê no livro impresso. Quem ajuda no livro pode ler.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver o livro" })).toBeVisible();
  });

  test("somente leitura: só Ver o livro", async ({ page }) => {
    await page.goto("/styleguide/bemvindo-leitura");
    await expect(page.getByRole("link", { name: "Ver o livro" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Gravar/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /mensagem/ })).toHaveCount(0);
  });
});

test.describe("Compartilhar no grupo", () => {
  test("a folha avisa quem vê e traz a mensagem pronta", async ({ page }) => {
    await page.goto("/styleguide/editor-grupo");
    const folha = page.getByRole("dialog", { name: "Compartilhar no grupo" });
    await expect(
      folha.getByText("Quem tiver este link ouve a voz e lê o texto."),
    ).toBeVisible();
    await expect(folha.getByText(/Ouça na voz dele/)).toBeVisible();
    await expect(
      folha.getByRole("button", { name: "Copiar mensagem" }),
    ).toBeVisible();
    await expect(
      folha.getByRole("button", { name: "Desligar este link" }),
    ).toBeVisible();
  });

  test("/o/: autor, título, Ouvir e texto; link desligado tem frase única", async ({
    page,
  }) => {
    await page.goto("/styleguide/compartilhada");
    await expect(page.getByText("Uma história de Vô Jair")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "O trem para Guarapari" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Ouvir" })).toBeVisible();
    await page.goto("/styleguide/compartilhada-indisponivel");
    await expect(
      page.getByText("Este link não está mais disponível."),
    ).toBeVisible();
  });
});

test("Lembrar com carinho aparece na pergunta enviada há 3 dias", async ({
  page,
}) => {
  await page.goto("/styleguide/perguntas-lembrar");
  const lembrar = page.getByRole("link", { name: "Lembrar com carinho" });
  await expect(lembrar).toBeVisible();
  await expect(lembrar).toHaveAttribute("href", /wa\.me\/5531999998888/);
});
