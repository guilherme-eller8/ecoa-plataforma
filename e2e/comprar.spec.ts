import { expect, test } from "@playwright/test";

// Prompt 14, parte 1: compra pelo Mercado Pago. Telas com dados de exemplo; o banco, o aviso
// e o processamento são testados no Vitest.

test.describe("Comprar (/comprar)", () => {
  test("Pagar só acende com e-mail válido e mostra para onde vai o acesso", async ({
    page,
  }) => {
    await page.goto("/styleguide/comprar");
    await expect(
      page.getByRole("heading", { name: "Comece o livro de memórias" }),
    ).toBeVisible();
    const pagar = page.getByRole("button", { name: "Pagar R$ 467" });
    await expect(pagar).toBeDisabled();
    await page.getByLabel("Seu e-mail").fill("Beatriz@Gmail.com");
    await expect(
      page.getByText("O acesso vai para beatriz@gmail.com"),
    ).toBeVisible();
    await expect(pagar).toBeEnabled();
    await expect(
      page.getByText("Pix ou cartão em até 12x (3x sem juros)"),
    ).toBeVisible();
    await expect(page.getByText(/Modo de teste/)).toHaveCount(0);
  });

  test("sugere o domínio certo e corrige com 1 toque", async ({ page }) => {
    await page.goto("/styleguide/comprar-sugestao");
    await page.getByRole("button", { name: /Você quis dizer/ }).click();
    await expect(page.getByLabel("Seu e-mail")).toHaveValue("fulano@gmail.com");
    await expect(
      page.getByRole("button", { name: /Você quis dizer/ }),
    ).toHaveCount(0);
  });

  test("modo de teste mostra a faixa", async ({ page }) => {
    await page.goto("/styleguide/comprar-teste");
    await expect(
      page.getByText("Modo de teste: nenhum valor é cobrado"),
    ).toBeVisible();
  });

  test("sem as credenciais, a compra real fica fechada e o aviso responde 503", async ({
    page,
    request,
  }) => {
    await page.goto("/comprar");
    await expect(
      page.getByRole("heading", { name: "A compra abre em breve." }),
    ).toBeVisible();
    const r = await request.post("/api/mercadopago?data.id=1&type=payment");
    expect(r.status()).toBe(503);
  });
});

test.describe("Volta do pagamento", () => {
  test("pronto: e-mail mascarado e Entrar com Google", async ({ page }) => {
    await page.goto("/styleguide/compra-pronta");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Pronto! Seu livro está criado.",
    );
    await expect(page.getByText("b•••@gmail.com")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Entrar com Google" }),
    ).toBeVisible();
  });

  test("esperando, não passou e conferindo", async ({ page }) => {
    await page.goto("/styleguide/compra-esperando");
    await expect(
      page.getByText("Pode fechar: avisamos por e-mail."),
    ).toBeVisible();
    await page.goto("/styleguide/compra-nao-passou");
    await expect(
      page.getByRole("link", { name: "Tentar de novo" }),
    ).toBeVisible();
    await page.goto("/styleguide/compra-conferindo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Estamos conferindo seu pagamento.",
    );
  });

  test("a volta de verdade sai sem cache, índice nem Referer", async ({
    request,
  }) => {
    const r = await request.get(
      "/comprar/pronto/c0ffee00-0000-4000-8000-000000000001",
    );
    expect(r.headers()["cache-control"]).toContain("no-store");
    expect(r.headers()["referrer-policy"]).toBe("no-referrer");
    expect(r.headers()["x-robots-tag"]).toContain("noindex");
  });
});

test("admin lista as compras com estado e alerta", async ({ page }) => {
  await page.goto("/styleguide/admin-compras");
  await expect(page.getByRole("heading", { name: /Compras/ })).toBeVisible();
  await expect(page.getByText("Retida: conferir")).toBeVisible();
  await expect(page.getByText(/Valor ou moeda diferente/)).toBeVisible();
});
