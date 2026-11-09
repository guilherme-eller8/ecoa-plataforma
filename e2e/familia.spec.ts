import { expect, test } from "@playwright/test";

test.describe("link da família (exemplo)", () => {
  test("marca até 5 e trava a 6ª; votar exige o nome", async ({ page }) => {
    await page.goto("/styleguide/familia");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Livro do Vô Jair",
    );
    const caixas = page.getByRole("checkbox");
    await expect(caixas).toHaveCount(6);
    for (let i = 0; i < 5; i++) await caixas.nth(i).check();
    await expect(caixas.nth(5)).toBeDisabled();
    await expect(page.getByText("5 de 5")).toBeVisible();
    const votar = page.getByRole("button", { name: "Votar" });
    await expect(votar).toBeDisabled();
    await page.getByLabel("Seu nome").fill("Ana");
    await expect(votar).toBeEnabled();
    await votar.click();
    await expect(page.getByText("Seu voto foi registrado")).toBeVisible();
  });

  test("sugerir causo por texto exige o consentimento", async ({ page }) => {
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
    await expect(page.getByText("Obrigado! Seu causo chegou.")).toBeVisible();
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
