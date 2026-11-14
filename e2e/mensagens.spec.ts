import { expect, test } from "@playwright/test";

// Prompt 12: telas com dados de exemplo (sem Supabase). O banco e os testes de unidade
// garantem as regras; aqui se confere o caminho de quem escreve e a curadoria dos membros.

test.describe("Link de mensagens (/m)", () => {
  test("pede nome e relação antes de gravar; escrever leva ao envio", async ({
    page,
  }) => {
    await page.goto("/styleguide/mensagem");
    await expect(
      page.getByRole("heading", { name: "Uma mensagem para o livro de Jair" }),
    ).toBeVisible();
    await expect(page.getByText(/É surpresa/)).toBeVisible();
    const gravar = page.getByRole("button", { name: "Gravar mensagem" });
    await expect(gravar).toBeDisabled();
    await page.getByLabel("Seu nome").fill("Lúcia");
    await page.getByLabel("Quem você é para Jair").fill("sobrinha");
    await expect(gravar).toBeEnabled();
    await page.getByRole("button", { name: "Prefiro escrever" }).click();
    await page.getByLabel("Sua mensagem").fill("Tio, obrigada por tudo.");
    const enviar = page.getByRole("button", { name: "Enviar mensagem" });
    await expect(enviar).toBeDisabled(); // falta o consentimento
    await page.getByLabel(/Autorizo guardar minha voz/).check();
    await enviar.click();
    await expect(page.getByText("Mensagem enviada. Obrigado!")).toBeVisible();
    await expect(page.getByText(/Peça a quem te mandou o link/)).toBeVisible();
  });

  test("conferir mostra o texto editável antes de enviar", async ({ page }) => {
    await page.goto("/styleguide/mensagem-conferir");
    await expect(
      page.getByRole("heading", { name: "Confira o texto" }),
    ).toBeVisible();
    await expect(page.getByLabel("Corrija o que quiser")).toHaveValue(
      /pescar no rio/,
    );
  });

  test("link inválido e livro fechado não deixam escrever", async ({
    page,
  }) => {
    await page.goto("/styleguide/mensagem-invalida");
    await expect(page.getByText(/Sua mensagem não foi enviada/)).toBeVisible();
    await page.goto("/styleguide/mensagem-fechada");
    await expect(
      page.getByText("Este livro não recebe mensagens agora."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Gravar mensagem" }),
    ).toHaveCount(0);
  });
});

test.describe("Aba Mensagens", () => {
  test("lista com contagem, chave No livro e folha com o original", async ({
    page,
  }) => {
    await page.goto("/styleguide/mensagens");
    await expect(page.getByText("3 mensagens · 2 no livro")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Convidar pelo WhatsApp" }),
    ).toHaveAttribute("href", /wa\.me\/\?text=.*surpresa/);
    await expect(
      page.getByRole("switch", { name: "Rafa no livro" }),
    ).not.toBeChecked();
    await page.getByRole("switch", { name: "Rafa no livro" }).check();
    await expect(
      page.getByRole("switch", { name: "Rafa no livro" }),
    ).toBeChecked();
    await page.getByRole("button", { name: /Carlos Mendes/ }).click();
    await page
      .getByRole("button", { name: "Ver o que Carlos Mendes enviou" })
      .click();
    await expect(page.getByText("O que Carlos Mendes enviou:")).toBeVisible();
  });

  test("arquivada: só o responsável apaga, com confirmação", async ({
    page,
  }) => {
    await page.goto("/styleguide/mensagens");
    await page.getByRole("button", { name: "1 arquivada" }).click();
    await page.getByRole("button", { name: /Promoção/ }).click();
    await page.getByRole("button", { name: "Apagar para sempre" }).click();
    await expect(page.getByText(/Não dá para desfazer/)).toBeVisible();
    await page.goto("/styleguide/mensagens-cofacilitador");
    await page.getByRole("button", { name: "1 arquivada" }).click();
    await page.getByRole("button", { name: /Promoção/ }).click();
    await expect(
      page.getByRole("button", { name: "Apagar para sempre" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Trocar o link" }),
    ).toHaveCount(0);
  });

  test("vazia: uma frase e o convite", async ({ page }) => {
    await page.goto("/styleguide/mensagens-vazia");
    await expect(
      page.getByText("Ninguém deixou mensagem ainda."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Convidar pelo WhatsApp" }),
    ).toBeVisible();
  });
});
