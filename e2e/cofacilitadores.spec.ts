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
    await expect(page.getByText("rafael@exemplo.com")).toBeVisible();
    await page.getByRole("button", { name: "Convidar" }).click();
    await page.getByLabel("E-mail de quem vai ajudar").fill("tia@exemplo.com");
    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText("tia@exemplo.com")).toBeVisible();
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
  test("sem sessão: Entrar para aceitar", async ({ page }) => {
    await page.goto("/styleguide/convite");
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
