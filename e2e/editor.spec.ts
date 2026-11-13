import { expect, test } from "@playwright/test";

// Prompt 8: editor de histórias, com dados de exemplo (sem Supabase). A trava e o salvamento
// de verdade são testados no banco (supabase/tests/editor.test.ts).

test.describe("Editor (exemplo)", () => {
  test("editar salva sozinho; tocar numa frase mostra Ouvir, que toca o trecho", async ({
    page,
  }) => {
    await page.goto("/styleguide/editor");
    const texto = page.locator(".ProseMirror");
    await expect(texto).toHaveAttribute("contenteditable", "true");
    await texto
      .locator("p")
      .nth(2)
      .click({ position: { x: 30, y: 10 } });
    const ouvir = page.getByRole("button", { name: "Ouvir", exact: true });
    await expect(ouvir).toBeVisible();
    await ouvir.click();
    await expect(
      page.getByText(/O Tião, meu primo, no outro dia/).last(),
    ).toBeVisible();
    await texto
      .locator("p")
      .nth(2)
      .click({ position: { x: 30, y: 10 } });
    await page.keyboard.type(" Foi em 1962.");
    await expect(
      page.getByRole("status").filter({ hasText: "Salvo" }),
    ).toBeVisible();
  });

  test("grifo Confira: mostra o motivo e sai com Está certo", async ({
    page,
  }) => {
    await page.goto("/styleguide/editor");
    await page.locator(".ProseMirror mark").first().click();
    const folha = page.getByRole("dialog", { name: "Confira" });
    await expect(folha.getByText(/não fala de emoção/)).toBeVisible();
    await folha.getByRole("button", { name: "Está certo" }).click();
    await expect(page.locator(".ProseMirror mark")).toHaveCount(0);
  });

  test("mudar uma letra do trecho grifado tira o grifo", async ({ page }) => {
    await page.goto("/styleguide/editor");
    // Cursor dentro do grifo pelo teclado (tocar no grifo abre o motivo).
    await expect(page.locator(".ProseMirror")).toHaveAttribute(
      "contenteditable",
      "true",
    );
    await page
      .locator(".ProseMirror p")
      .nth(1)
      .click({ position: { x: 2, y: 10 } });
    await page.keyboard.press("Home");
    for (let i = 0; i < 105; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.type("x");
    await expect(page.locator(".ProseMirror mark")).toHaveCount(0);
  });

  test("outra pessoa editando: aviso e texto só para ler", async ({ page }) => {
    await page.goto("/styleguide/editor-trava");
    await expect(page.getByText("Ana está editando.")).toBeVisible();
    await expect(page.locator(".ProseMirror")).toHaveAttribute(
      "contenteditable",
      "false",
    );
  });

  test("a mesma pessoa em outra tela pode assumir", async ({ page }) => {
    await page.goto("/styleguide/editor-outra-tela");
    await expect(
      page.getByText("Você está editando em outra tela."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Editar aqui" }).click();
    await expect(page.locator(".ProseMirror")).toHaveAttribute(
      "contenteditable",
      "true",
    );
  });

  test("foto pequena avisa; Marcar como pronta vira Pronta para o livro", async ({
    page,
  }) => {
    await page.goto("/styleguide/editor");
    await expect(page.getByText("Pequena para imprimir bem.")).toBeVisible();
    await page.getByRole("button", { name: "Marcar como pronta" }).click();
    await expect(page.getByText("Pronta para o livro")).toBeVisible();
  });

  test("Pôr fotos do acervo", async ({ page }) => {
    await page.goto("/styleguide/editor");
    await page.getByRole("button", { name: "Pôr fotos" }).click();
    const folha = page.getByRole("dialog", { name: "Pôr fotos" });
    await folha.getByRole("button", { name: "Foto do acervo" }).first().click();
    await folha.getByRole("button", { name: "Pôr 1 foto" }).click();
    await expect(page.getByText("3 de 4")).toBeVisible();
  });

  test("celular: abas Texto e Áudio; tocar na transcrição toca", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "abas só no celular");
    await page.goto("/styleguide/editor");
    await page.getByRole("tab", { name: "Áudio" }).click();
    await page.getByRole("button", { name: /E o Tião\?/ }).click();
    await expect(page.locator("[aria-current=true]")).toContainText(
      "E o Tião?",
    );
  });
});

test.describe("Histórico (exemplo)", () => {
  test("restaurar uma versão antiga", async ({ page }) => {
    await page.goto("/styleguide/versoes");
    await expect(
      page.getByRole("button", { name: /Texto de agora/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Escrita pela IA/ }).click();
    const folha = page.getByRole("dialog");
    await expect(
      folha.getByRole("button", { name: "Restaurar esta versão" }),
    ).toBeVisible();
    await folha.getByRole("button", { name: "Restaurar esta versão" }).click();
    // Volta para o editor (na vitrine, sem sessão, cai no /entrar).
    await expect(page).not.toHaveURL(/styleguide\/versoes/);
  });
});
