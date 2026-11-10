import { expect, test } from "@playwright/test";

test.describe("link da família (exemplo)", () => {
  test("vota em etapas por fase: até 2 por fase, revisa e vota", async ({
    page,
  }) => {
    await page.goto("/styleguide/familia");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Livro do Vô Jair",
    );
    await expect(
      page.getByText(
        "Escolha as histórias que você quer ouvir do Vô Jair. Até 2 por fase.",
      ),
    ).toBeVisible();
    // Etapa 1: Infância, com 3 opções; a 3ª trava depois de 2.
    await expect(page.getByRole("heading", { name: "Infância" })).toBeVisible();
    await expect(page.getByText("Etapa 1 de 5")).toBeVisible();
    const caixas = page.getByRole("checkbox");
    await expect(caixas).toHaveCount(3);
    await caixas.nth(0).check();
    await caixas.nth(1).check();
    await expect(caixas.nth(2)).toBeDisabled();
    await expect(page.getByText("2 de 2")).toBeVisible();
    await page.getByRole("button", { name: "Próxima" }).click();
    // Etapa 2: Escola. Pula até a revisão.
    await expect(page.getByRole("heading", { name: "Escola" })).toBeVisible();
    for (let i = 0; i < 3; i++)
      await page.getByRole("button", { name: "Próxima" }).click();
    await page.getByRole("button", { name: "Revisar" }).click();
    // Revisão: só Infância, com as 2 escolhidas; votar exige o nome.
    await expect(
      page.getByRole("heading", { name: "Revisar seu voto" }),
    ).toBeVisible();
    await expect(page.getByText("2 histórias escolhidas")).toBeVisible();
    const votar = page.getByRole("button", { name: "Votar" });
    await expect(votar).toBeDisabled();
    await page.getByLabel("Seu nome").fill("Ana");
    await expect(votar).toBeEnabled();
    await votar.click();
    await expect(page.getByText("Seu voto foi registrado")).toBeVisible();
    await page.getByRole("button", { name: "Mudar meu voto" }).click();
    await expect(
      page.getByRole("heading", { name: "Revisar seu voto" }),
    ).toBeVisible();
  });

  test("sugerir causo por texto exige o consentimento", async ({ page }) => {
    // A família escolhe entre pergunta e causo; o causo vem marcado.
    await page.goto("/styleguide/familia-causo");
    await page.getByLabel("Seu nome").fill("Ana");
    await page.getByRole("radio", { name: "Escrever" }).click();
    await page
      .getByLabel("O causo")
      .fill("Pede pra ele contar da Rural atolada");
    const enviar = page.getByRole("button", { name: "Enviar" });
    await expect(enviar).toBeDisabled();
    await page.getByRole("checkbox").check();
    await expect(enviar).toBeEnabled();
    await enviar.click();
    await expect(
      page.getByText("Obrigado! Sua sugestão chegou."),
    ).toBeVisible();
  });

  test("a família também sugere uma pergunta", async ({ page }) => {
    await page.goto("/styleguide/familia-causo");
    await page.getByRole("radio", { name: "Uma pergunta para ele" }).click();
    await page.getByLabel("Seu nome").fill("Bia");
    await page.getByRole("radio", { name: "Escrever" }).click();
    await page
      .getByLabel("A pergunta")
      .fill("Como foi chegar em Belo Horizonte?");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(
      page.getByText("Obrigado! Sua sugestão chegou."),
    ).toBeVisible();
  });

  test("sem rolagem lateral no celular", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const tela of [
      "familia",
      "familia-causo",
      "perguntas",
      "perguntas-enquete",
      "kit",
      "configurar-perguntas",
    ]) {
      await page.goto(`/styleguide/${tela}`);
      const sobra = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(sobra, tela).toBeLessThanOrEqual(0);
    }
  });
});
