import { expect, test } from "@playwright/test";

test("sem sessão, a home leva para /entrar", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar$/);
});

test.describe("rotas protegidas sem sessão", () => {
  for (const rota of ["/livro/qualquer", "/admin"]) {
    test(`${rota} leva para /entrar`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/entrar$/);
    });
  }
});

// A vitrine (/styleguide) só existe com ECOA_STYLEGUIDE=1; o build do e2e liga essa flag,
// então a regra é coberta pelo teste unitário lib/dev.test.ts.
