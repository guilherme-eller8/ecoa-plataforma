import { expect, test } from "@playwright/test";

test("a home abre com o título em Newsreader", async ({ page }) => {
  await page.goto("/");

  const titulo = page.getByRole("heading", { level: 1 });
  await expect(titulo).toHaveText("Ecoa Memórias");
  await expect(page).toHaveTitle("Ecoa Memórias");

  const fonte = await titulo.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fonte).toMatch(/Newsreader/);

  // A fonte precisa ter carregado de fato, não só estar declarada.
  const carregada = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(
      (f) => /Newsreader/.test(f.family) && f.status === "loaded",
    );
  });
  expect(carregada).toBe(true);
});
