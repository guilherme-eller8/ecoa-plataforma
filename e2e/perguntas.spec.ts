import { expect, test } from "@playwright/test";

test.describe("tela Perguntas (exemplo)", () => {
  test("5 abas, com Para perguntar primeiro", async ({ page }) => {
    await page.goto("/styleguide/perguntas");
    const abas = page.getByRole("tab");
    await expect(abas).toHaveCount(5);
    await expect(abas.first()).toContainText("Para perguntar");
    await expect(abas.first()).toHaveAttribute("aria-selected", "true");
  });

  test("Enviar ao autor abre o wa.me com a pergunta", async ({ page }) => {
    await page.goto("/styleguide/perguntas");
    const enviar = page
      .getByRole("link", { name: /Enviar ao Vô Jair/ })
      .first();
    const href = await enviar.getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(href!.split("text=")[1])).toContain("Vô Jair");
  });

  test("enquete: ranking e Salvar as N mais votadas", async ({ page }) => {
    await page.goto("/styleguide/perguntas-enquete");
    await expect(page.getByText("5 pessoas votaram")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Salvar as 3 mais votadas" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mais", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Salvar as 4 mais votadas" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Salvar as 4 mais votadas" })
      .click();
    await expect(page.getByText("3 em Para perguntar.")).toBeVisible();
  });

  test("tocar num nome pede confirmação para remover os votos", async ({
    page,
  }) => {
    await page.goto("/styleguide/perguntas-enquete");
    await page.getByRole("button", { name: "Marcos" }).first().click();
    await expect(
      page.getByRole("dialog", { name: "Remover os votos de Marcos?" }),
    ).toBeVisible();
  });

  test("causos chegam com Virar pergunta", async ({ page }) => {
    await page.goto("/styleguide/perguntas-causos");
    await expect(
      page.locator("p", { hasText: /Rural atolou na estrada/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Virar pergunta" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Ouvir/ })).toBeVisible();
  });

  test("kit: convite do grupo e mensagem ao autor abrem o wa.me", async ({
    page,
  }) => {
    await page.goto("/styleguide/kit");
    const links = page.getByRole("link", { name: /Enviar/ });
    await expect(links).toHaveCount(2);
    for (const l of await links.all())
      expect(await l.getAttribute("href")).toMatch(
        /^https:\/\/wa\.me\/\?text=/,
      );
  });
});
