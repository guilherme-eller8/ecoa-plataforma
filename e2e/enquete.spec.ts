import { expect, test } from "@playwright/test";

test.describe("Nova enquete (exemplo)", () => {
  test("mostra as duas formas: todas as perguntas ou escolher antes", async ({
    page,
  }) => {
    await page.goto("/styleguide/nova-enquete");
    await expect(
      page.getByRole("heading", { name: "Nova enquete" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Todas as perguntas/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Eu escolho antes/ }),
    ).toBeVisible();
  });

  test("Todas as perguntas leva à revisão por fase", async ({ page }) => {
    await page.goto("/styleguide/nova-enquete");
    await page.getByRole("button", { name: /Todas as perguntas/ }).click();
    await expect(
      page.getByRole("heading", { name: "Revisar a enquete" }),
    ).toBeVisible();
    await expect(
      page.getByText(/em 8 fases\. Cada pessoa marca até 2 por fase\./),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Mudar" })).toHaveCount(9);
    await expect(
      page.getByRole("button", { name: "Abrir enquete" }),
    ).toBeEnabled();
  });

  test("Eu escolho antes: uma fase por etapa, e a revisão mostra só o marcado", async ({
    page,
  }) => {
    await page.goto("/styleguide/nova-enquete");
    await page.getByRole("button", { name: /Eu escolho antes/ }).click();
    await expect(
      page.getByRole("heading", { name: "Família e raízes" }),
    ).toBeVisible();
    await expect(page.getByText("Etapa 1 de 9")).toBeVisible();
    await page.getByRole("button", { name: "Próxima" }).click();
    await expect(page.getByRole("heading", { name: "Infância" })).toBeVisible();
    await page.getByRole("checkbox").nth(0).check();
    await page.getByRole("checkbox").nth(1).check();
    await expect(page.getByText("2 marcadas")).toBeVisible();
    await page.getByRole("button", { name: "Próxima" }).click();
    for (let i = 0; i < 6; i++)
      await page.getByRole("button", { name: "Próxima" }).click();
    await expect(
      page.getByRole("heading", { name: "Outras perguntas" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Revisar" }).click();
    await expect(page.getByText(/^2 perguntas em 1 fase\./)).toBeVisible();
    await expect(page.getByRole("button", { name: "Mudar" })).toHaveCount(1);
    await page.getByRole("button", { name: "Mudar" }).click();
    await expect(page.getByRole("heading", { name: "Infância" })).toBeVisible();
  });

  test("com menos de 2 marcadas, não abre", async ({ page }) => {
    await page.goto("/styleguide/nova-enquete");
    await page.getByRole("button", { name: /Eu escolho antes/ }).click();
    for (let i = 0; i < 8; i++)
      await page.getByRole("button", { name: "Próxima" }).click();
    await page.getByRole("button", { name: "Revisar" }).click();
    await expect(
      page.getByText("Marque pelo menos 2 perguntas."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Abrir enquete" }),
    ).toBeDisabled();
  });
});
