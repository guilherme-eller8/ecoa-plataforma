import { expect, test } from "@playwright/test";

// Prompt 10: player do QR e folha da página de amostra. Telas com dados de exemplo; o host
// ouvir. é testado pelo cabeçalho Host (sem Supabase, a consulta cai em "Não deu certo").

test.describe("Player do QR (exemplo)", () => {
  test("título, ano e um botão Ouvir", async ({ page }) => {
    await page.goto("/styleguide/player");
    await expect(
      page.getByRole("heading", { name: "O trem para Guarapari" }),
    ).toBeVisible();
    await expect(page.getByText("1962")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ouvir" })).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Andamento" }),
    ).toBeVisible();
  });

  test("código não encontrado: digitar com 0, O, 1, I ou L avisa sem consultar", async ({
    page,
  }) => {
    await page.goto("/styleguide/player-nao-encontrado");
    await expect(page.getByText(/Não achamos este código/)).toBeVisible();
    await page.getByLabel("Código embaixo do QR").fill("7KQ2 M9X0");
    await page.getByRole("button", { name: "Ouvir" }).click();
    await expect(page.getByText(/não tem 0, O, 1, I nem L/)).toBeVisible();
  });

  test("raiz: digitar o código leva ao player, em maiúsculas", async ({
    page,
  }) => {
    await page.goto("/styleguide/player-digitar");
    await page.getByLabel("Digite o código embaixo do QR").fill("7kq2-m9xa");
    await page.getByRole("button", { name: "Ouvir" }).click();
    await page.waitForURL(/\/ouvir\/7KQ2M9XA$/);
    await expect(
      page.getByText(/Não deu certo agora|Não achamos/),
    ).toBeVisible();
  });

  test("estados preparando e desligado têm uma frase", async ({ page }) => {
    await page.goto("/styleguide/player-preparando");
    await expect(page.getByText(/sendo preparada/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tentar de novo" }),
    ).toBeVisible();
    await page.goto("/styleguide/player-desativado");
    await expect(page.getByText(/não está mais disponível/)).toBeVisible();
  });
});

test.describe("Host ouvir.", () => {
  const OUVIR = { Host: "ouvir.ecoa-memorias.com.br" };

  test("raiz mostra o campo; código vira o player; o resto é 404", async ({
    request,
  }) => {
    const raiz = await request.get("/", { headers: OUVIR });
    expect(raiz.status()).toBe(200);
    expect(await raiz.text()).toContain("Ouça a voz do livro");
    expect(raiz.headers()["cache-control"]).toContain("no-store");
    expect(raiz.headers()["x-robots-tag"]).toContain("noindex");

    const codigo = await request.get("/7kq2m9xa", { headers: OUVIR });
    expect(codigo.status()).toBe(200);

    for (const c of [
      "/livro/1",
      "/f/v1_aaaaaaaaaaaaaaaaaaaaaa",
      "/admin123",
      "/entrar",
    ]) {
      const r = await request.get(c, { headers: OUVIR, maxRedirects: 0 });
      expect(r.status(), c).toBe(404);
    }
  });

  test("no host app, /ouvir vai para o ouvir.", async ({ request }) => {
    const r = await request.get("/ouvir/7KQ2M9XA", {
      headers: { Host: "app.ecoa-memorias.com.br" },
      maxRedirects: 0,
    });
    expect(r.status()).toBe(308);
    expect(r.headers()["location"]).toBe(
      "https://ouvir.ecoa-memorias.com.br/7KQ2M9XA",
    );
  });
});

test.describe("Página de amostra (exemplo)", () => {
  test("história pronta mostra o botão; voz pronta libera Baixar PDF e o desligar", async ({
    page,
  }) => {
    await page.goto("/styleguide/editor-pronta");
    await expect(
      page.getByRole("button", { name: "Página de amostra" }),
    ).toBeVisible();
    await page.goto("/styleguide/editor-amostra");
    const folha = page.getByRole("dialog", { name: "Página de amostra" });
    await expect(folha.getByRole("link", { name: "Baixar PDF" })).toBeVisible();
    await expect(folha.getByText("7KQ2 M9XA")).toBeVisible();
    await folha.getByRole("button", { name: "Desligar este QR" }).click();
    await expect(folha.getByText(/não vai ouvir mais nada/)).toBeVisible();
  });

  test("voz preparando: sem Baixar PDF", async ({ page }) => {
    await page.goto("/styleguide/editor-amostra-preparando");
    const folha = page.getByRole("dialog", { name: "Página de amostra" });
    await expect(folha.getByText("Preparando a voz…")).toBeVisible();
    await expect(folha.getByRole("link", { name: "Baixar PDF" })).toHaveCount(
      0,
    );
  });
});
