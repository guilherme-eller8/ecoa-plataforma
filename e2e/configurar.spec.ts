import { expect, test } from "@playwright/test";

test.describe("configuração inicial (exemplo)", () => {
  test("passo 1: só o nome é obrigatório", async ({ page }) => {
    await page.goto("/styleguide/configurar-quem");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Quem vai contar as histórias?",
    );
    const continuar = page.getByRole("button", { name: "Continuar" });
    await expect(continuar).toBeEnabled();
    await page.getByLabel("Nome").fill("");
    await expect(continuar).toBeDisabled();
    await expect(page.getByRole("button", { name: "Pular" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Depois" })).toBeVisible();
  });

  test("passo 2: 10 perguntas já marcadas, e desmarcar muda o botão", async ({
    page,
  }) => {
    await page.goto("/styleguide/configurar-perguntas");
    const caixas = page.getByRole("checkbox");
    await expect(caixas).toHaveCount(10);
    for (const c of await caixas.all()) await expect(c).toBeChecked();
    await expect(
      page.getByRole("button", { name: "Salvar 10 perguntas" }),
    ).toBeVisible();
    await caixas.first().uncheck();
    await expect(
      page.getByRole("button", { name: "Salvar 9 perguntas" }),
    ).toBeVisible();
  });

  test("passo 2: escrever a minha entra na lista", async ({ page }) => {
    await page.goto("/styleguide/configurar-perguntas");
    await page.getByRole("button", { name: "Escrever a minha" }).click();
    await page.getByRole("radio", { name: "Causo" }).click();
    await page
      .getByLabel("O causo que ele deve contar")
      .fill("Conta da vez em Guarapari");
    await page.getByRole("button", { name: "Pôr na lista" }).click();
    await expect(page.getByText("Conta da vez em Guarapari")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Salvar 11 perguntas" }),
    ).toBeVisible();
  });
});
