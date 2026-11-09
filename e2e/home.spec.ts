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

test("a vitrine de telas não existe fora do gate de design", async ({
  request,
}) => {
  const resposta = await request.get("/styleguide/entrar");
  expect(resposta.status()).toBe(404);
});
