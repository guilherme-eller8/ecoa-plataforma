import { expect, test } from "@playwright/test";

test.describe("home do responsável (exemplo)", () => {
  test("mostra o livro e a ação principal no primeiro olhar", async ({
    page,
  }) => {
    await page.goto("/styleguide/responsavel");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Livro do Jair",
    );

    const gravar = page.getByRole("button", { name: "Gravar agora" });
    await expect(gravar).toBeVisible();
    const caixa = await gravar.boundingBox();
    const altura = page.viewportSize()!.height;
    expect(caixa!.y + caixa!.height).toBeLessThan(altura);
  });

  test("enviar ao autor abre a folha e fecha com Esc", async ({ page }) => {
    await page.goto("/styleguide/responsavel");
    await page.getByRole("button", { name: "Enviar ao Jair" }).click();
    const folha = page.getByRole("dialog", { name: "Enviar ao Jair" });
    await expect(folha).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(folha).toBeHidden();
  });
});

test.describe("área do autor (exemplo)", () => {
  test("segue as regras de tamanho do PRD", async ({ page }) => {
    await page.goto("/styleguide/autor");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Olá, Jair",
    );

    // Pergunta com no mínimo 28px.
    const pergunta = page.locator("#pergunta");
    const tamanho = await pergunta.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(tamanho).toBeGreaterThanOrEqual(28);

    // Botão de gravar com 120px ou mais.
    const gravar = await page
      .getByRole("button", { name: "Gravar" })
      .boundingBox();
    expect(gravar!.width).toBeGreaterThanOrEqual(120);
    expect(gravar!.height).toBeGreaterThanOrEqual(120);

    // Todo alvo de toque visível com 56px ou mais de altura.
    const alvos = await page
      .locator("main a:visible, main button:visible, nav a:visible")
      .all();
    for (const alvo of alvos) {
      const c = await alvo.boundingBox();
      expect(c!.height, await alvo.innerText()).toBeGreaterThanOrEqual(56);
    }

    // Texto das histórias com 20px.
    const trecho = page.locator("#minhas ~ ul p").first();
    const corpo = await trecho.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(corpo).toBeGreaterThanOrEqual(20);
  });

  test("não menciona mensagens da família", async ({ page }) => {
    await page.goto("/styleguide/autor");
    await expect(page.locator("body")).not.toContainText(/mensage/i);
  });

  test("o gravador mostra o cronômetro e o ponto ao gravar", async ({
    page,
  }) => {
    await page.goto("/styleguide/autor");
    await page.getByRole("button", { name: "Gravar" }).click();
    await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page.getByRole("button", { name: "Concluir" })).toBeVisible();
  });
});

test.describe("reduzir movimento", () => {
  test.use({ reducedMotion: "reduce" });

  test("o ponto de gravação fica parado", async ({ page }) => {
    await page.goto("/styleguide/autor");
    await page.getByRole("button", { name: "Gravar" }).click();
    const ponto = page.locator("span.bg-gravando");
    await expect(ponto).toBeVisible();
    const repeticoes = await ponto.evaluate(
      (el) => getComputedStyle(el).animationIterationCount,
    );
    expect(repeticoes).toBe("1");
  });
});
