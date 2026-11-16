import { expect, test } from "@playwright/test";

// P72: folhear o livro antes de publicar. Telas do styleguide com páginas de exemplo renderizadas
// pelo template de verdade. No computador, o livro aberto (par à esquerda, ímpar à direita).
test.describe("Folhear o livro (exemplo)", () => {
  test("começa pela capa e avança página a página; avisa do QR que nasce ao publicar", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/styleguide/folhear");
    await expect(
      page.getByRole("heading", { name: "Folhear o livro" }),
    ).toBeVisible();
    await expect(page.getByText("Capa", { exact: true })).toBeVisible();
    await expect(page.getByText(/quadrado tracejado vira o QR/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "← Anterior" }),
    ).toBeDisabled();

    const proxima = page.getByRole("button", { name: "Próxima →" });
    await proxima.click();
    await expect(page.getByText("Página 1 de 8")).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Página 1 de 8" }),
    ).toBeVisible();

    await proxima.click();
    if (isMobile) {
      await expect(page.getByText("Página 2 de 8")).toBeVisible();
    } else {
      await expect(page.getByText("Páginas 2 e 3 de 8")).toBeVisible();
      await expect(
        page.getByRole("img", { name: "Página 3 de 8" }),
      ).toBeVisible();
    }
  });

  test("setas do teclado folheiam", async ({ page, isMobile }) => {
    test.skip(isMobile, "teclado só no computador");
    await page.goto("/styleguide/folhear");
    await expect(page.getByText("Capa", { exact: true })).toBeVisible();
    await expect(page.locator('[data-teclado="ligado"]')).toHaveCount(1);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("Página 1 de 8")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Capa", { exact: true })).toBeVisible();
  });

  test("sem história pronta: uma frase e um botão", async ({ page }) => {
    await page.goto("/styleguide/folhear-vazio");
    await expect(
      page.getByText("Ainda não há histórias prontas para folhear."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ver as histórias" }),
    ).toBeVisible();
  });

  test("a montagem leva ao Folhear", async ({ page }) => {
    await page.goto("/styleguide/montar-conferir");
    await expect(
      page.getByRole("link", { name: "Folhear antes de publicar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Folhear o livro" }),
    ).toBeVisible();
  });

  test("tocar na foto abre Ajustar a foto ali mesmo (P76)", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/styleguide/folhear");
    await expect(page.getByText("Capa", { exact: true })).toBeVisible();
    await expect(page.getByText("Toque numa foto para ajustar.")).toBeVisible();
    const proxima = page.getByRole("button", { name: "Próxima →" });
    // A foto de exemplo está na página 6.
    for (let i = 0; i < (isMobile ? 6 : 4); i++) await proxima.click();
    await expect(
      page.getByText(isMobile ? "Página 6 de 8" : "Páginas 6 e 7 de 8"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Ajustar esta foto" }).click();
    const folha = page.getByRole("dialog", { name: "Ajustar a foto" });
    await expect(folha).toBeVisible();
    await expect(
      folha.getByRole("radio", { name: "Página inteira, ao lado" }),
    ).toBeVisible();
  });
});
