import { expect, test } from "@playwright/test";

// Prompt 13: montar e publicar o livro, com dados de exemplo (sem Supabase). O banco e os testes
// de unidade garantem as regras; aqui se confere o caminho de quem monta e de quem confere.

test.describe("Montar o livro: Conteúdo", () => {
  test("mostra histórias e mensagens, com setas e o contador fixo", async ({
    page,
  }) => {
    await page.goto("/styleguide/montar-conteudo");
    await expect(
      page.getByRole("heading", { name: "O que entra no livro" }),
    ).toBeVisible();
    await expect(
      page.getByText("Use as setas para mudar a ordem."),
    ).toBeVisible();
    await expect(page.getByText("O trem para Guarapari").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Mensagens da família/ }),
    ).toBeVisible();
    // A 1ª não sobe e a última não desce.
    await expect(
      page.getByRole("button", { name: "Subir O trem para Guarapari" }),
    ).toBeDisabled();
    // O contador (renderização real no servidor) aparece embaixo.
    await expect(page.getByText("72 páginas")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Próximo: capa" }),
    ).toBeEnabled();
  });

  test("subir uma história troca a ordem; tirar risca e pode pôr de volta", async ({
    page,
  }) => {
    await page.goto("/styleguide/montar-conteudo");
    const titulos = () =>
      page.locator("section[aria-label='Histórias'] li span.font-livro");
    await expect(titulos().first()).toHaveText("O trem para Guarapari");
    await page
      .getByRole("button", { name: "Subir A casa da rua Bahia" })
      .click();
    await expect(titulos().first()).toHaveText("A casa da rua Bahia");
    const tirar = page.getByRole("button", { name: "Tirar" }).first();
    await tirar.click();
    await expect(
      page.getByRole("button", { name: "Pôr de volta" }),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "Pôr de volta" }).click();
    await expect(
      page.getByRole("button", { name: "Pôr de volta" }),
    ).toHaveCount(0);
  });

  test("riscada fica cinza e tachada, no lugar", async ({ page }) => {
    await page.goto("/styleguide/montar-conteudo-riscada");
    await expect(
      page.getByRole("button", { name: "Pôr de volta" }),
    ).toHaveCount(2);
    await expect(page.getByText("Como conheci a Maria")).toHaveClass(
      /line-through/,
    );
  });

  test("sem história pronta: uma frase e um botão", async ({ page }) => {
    await page.goto("/styleguide/montar-conteudo-vazia");
    await expect(
      page.getByText(
        "Quando a primeira história ficar pronta, ela aparece aqui.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Nova história" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Próximo: capa" }),
    ).toBeDisabled();
  });
});

test.describe("Montar o livro: Capa", () => {
  test("título já vem preenchido, com prévia e cinco cores", async ({
    page,
  }) => {
    await page.goto("/styleguide/montar-capa");
    await expect(page.getByRole("heading", { name: "A capa" })).toBeVisible();
    await expect(page.getByLabel("Título", { exact: true })).toHaveValue(
      "Histórias do Vô Jair",
    );
    await expect(page.getByRole("img", { name: /Capa aberta/ })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(5);
    await expect(page.getByRole("radio", { name: "Terracota" })).toBeChecked();
    await page.getByRole("radio", { name: "Oliva" }).click();
    await expect(page.getByRole("radio", { name: "Oliva" })).toBeChecked();
  });

  test("sem título não deixa seguir", async ({ page }) => {
    await page.goto("/styleguide/montar-capa");
    await page.getByLabel("Título", { exact: true }).fill("");
    await expect(
      page.getByRole("button", { name: "Próximo: conferir" }),
    ).toBeDisabled();
  });
});

test.describe("Montar o livro: Conferir", () => {
  test("livro certo: o número grande, a frase e o Publicar com confirmação", async ({
    page,
  }) => {
    await page.goto("/styleguide/montar-conferir");
    await expect(
      page.getByRole("heading", { name: "72 páginas" }),
    ).toBeVisible();
    await expect(page.getByText("Cabe no plano (80 páginas).")).toBeVisible();
    const publicar = page
      .getByRole("button", { name: "Publicar", exact: true })
      .first();
    await expect(publicar).toBeEnabled();
    await publicar.click();
    await expect(
      page.getByText(
        "Publicar a versão 1? O que mudar depois fica para a próxima.",
      ),
    ).toBeVisible();
  });

  test("vermelho bloqueia o Publicar; amarelo só avisa", async ({ page }) => {
    await page.goto("/styleguide/montar-conferir-vermelho");
    await expect(page.getByText(/falta revisar/)).toBeVisible();
    await expect(page.getByText(/é bem curta/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Publicar", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("link", { name: "Resolver" }).first(),
    ).toBeVisible();
  });

  test("acima de 80 páginas: informa o extra, nunca bloqueia (Q16)", async ({
    page,
  }) => {
    await page.goto("/styleguide/montar-conferir-acima-80");
    await expect(
      page.getByRole("heading", { name: "92 páginas" }),
    ).toBeVisible();
    await expect(
      page.getByText(/as 12 a mais entram no orçamento da gráfica/),
    ).toBeVisible();
    await expect(page.getByText("92 páginas · 12 extras")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Publicar", exact: true }),
    ).toBeEnabled();
  });

  test("co-facilitador vê quem publica no lugar do botão (P60)", async ({
    page,
  }) => {
    await page.goto("/styleguide/montar-conferir-cofacilitador");
    await expect(page.getByText(/Só .* publica\./)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Publicar", exact: true }),
    ).toHaveCount(0);
  });
});

test.describe("Versão publicada", () => {
  test("preparando, pronta e que não deu certo", async ({ page }) => {
    await page.goto("/styleguide/versao-gerando");
    await expect(page.getByText("Preparando os PDFs.")).toBeVisible();
    await expect(page.getByText("Leva cerca de 1 minuto.")).toBeVisible();

    await page.goto("/styleguide/versao-falhou");
    await expect(page.getByText("Não deu certo desta vez.")).toBeVisible();
    await expect(page.getByText("Publique de novo.")).toBeVisible();

    await page.goto("/styleguide/versao-pronta");
    await expect(
      page.getByRole("heading", { name: "Versão 1 do livro" }),
    ).toBeVisible();
    await expect(page.getByText("Vozes prontas: 7 de 8")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Baixar miolo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Baixar capa" }),
    ).toBeVisible();
    await expect(page.getByText("Capa", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Próxima →" }).click();
    await expect(page.getByText("Página 1 de 84")).toBeVisible();
  });
});
