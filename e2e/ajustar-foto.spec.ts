import { expect, test } from "@playwright/test";

// P75: ajustar a foto da história (cortar e escolher onde fica). Tela do styleguide com a foto alta
// do 1º teste real.
test.describe("Ajustar a foto (exemplo)", () => {
  test("cada foto do editor tem Ajustar", async ({ page }) => {
    await page.goto("/styleguide/editor-pronta");
    await expect(
      page.getByRole("button", { name: "Ajustar" }).first(),
    ).toBeVisible();
  });

  test("formato, aproximar e onde fica; página inteira avisa da página a mais", async ({
    page,
  }) => {
    await page.goto("/styleguide/editor-ajustar-foto");
    const folha = page.getByRole("dialog", { name: "Ajustar a foto" });
    await expect(
      folha.getByRole("group", { name: /Parte da foto que vai para o livro/ }),
    ).toBeVisible();
    await expect(
      folha.getByRole("radio", { name: "Inteira", exact: true }),
    ).toHaveAttribute("aria-checked", "true");

    await folha.getByRole("radio", { name: "Em pé" }).click();
    await expect(folha.getByRole("radio", { name: "Em pé" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(
      folha.getByRole("slider", { name: "Aproximar" }),
    ).toBeVisible();

    await expect(folha.getByText("Usa 1 página a mais no livro.")).toHaveCount(
      0,
    );
    await folha.getByRole("radio", { name: "Página inteira, ao lado" }).click();
    await expect(
      folha.getByText("Usa 1 página a mais no livro."),
    ).toBeVisible();
    await expect(folha.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });
});
