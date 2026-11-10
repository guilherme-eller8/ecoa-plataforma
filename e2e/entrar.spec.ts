import { expect, test } from "@playwright/test";

test("/entrar tem uma ação principal: Entrar com Google", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page).toHaveTitle("Entrar · Ecoa Memórias");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Entre no seu livro",
  );
  await expect(
    page.getByRole("button", { name: "Entrar com Google" }),
  ).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(2); // Google + "prefiro link por e-mail"
});

test("a marca usa a fonte do livro (Newsreader)", async ({ page }) => {
  await page.goto("/entrar");
  const marca = page.getByText("Ecoa Memórias").first();
  const fonte = await marca.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fonte).toMatch(/Newsreader/);
  const carregada = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(
      (f) => /Newsreader/.test(f.family) && f.status === "loaded",
    );
  });
  expect(carregada).toBe(true);
});

test("o link por e-mail revela o campo e responde igual para qualquer e-mail", async ({
  page,
}) => {
  await page.goto("/entrar");
  await page
    .getByRole("button", { name: "Prefiro receber um link por e-mail" })
    .click();
  await page.getByLabel("Seu e-mail").fill("ninguem@exemplo.com");
  await page.getByRole("button", { name: "Receber link" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Se este e-mail tiver um livro, o link chega em instantes.",
  );
});

test("erro de conta sem livro aparece na tela", async ({ page }) => {
  await page.goto("/entrar?erro=sem_livro");
  await expect(page.getByRole("alert").filter({ hasText: "livro" })).toHaveText(
    "Este e-mail ainda não tem um livro.",
  );
});

test("o link do e-mail abre uma tela com botão, sem entrar sozinho", async ({
  page,
}) => {
  await page.goto("/auth/confirmar?token_hash=abcdefgh12345678");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Toque para entrar no seu livro",
  );
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/confirmar/);
});

test("o callback do Google sem código volta para /entrar com erro", async ({
  page,
}) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/entrar\?erro=falhou$/);
});

test("cadastro desligado volta com 'sem livro'", async ({ page }) => {
  await page.goto(
    "/auth/callback?error=access_denied&error_code=signup_disabled",
  );
  await expect(page).toHaveURL(/\/entrar\?erro=sem_livro$/);
});
