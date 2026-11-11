import { expect, test } from "@playwright/test";

// Prompt 6: histórias ao vivo, leitura com Confira, configurações e situação dos áudios.
// Telas de exemplo (sem Supabase): o canal fica desligado e o texto ao vivo vem de exemplo.

test.describe("Histórias (exemplo)", () => {
  test("cartão escrevendo mostra a etapa e o texto chegando; pronta leva à leitura", async ({
    page,
  }) => {
    await page.goto("/styleguide/historias");
    await expect(
      page.getByRole("heading", { name: "Histórias" }),
    ).toBeVisible();
    await expect(page.getByText(/^Escrevendo, etapa 3 de 4/)).toBeVisible();
    await expect(page.getByText(/chão de terra batida/)).toBeVisible();
    await expect(
      page.getByText(/^Pronta para revisar, etapa 4 de 4/),
    ).toBeVisible();
    await expect(
      page.getByText("Não deu certo. Já estamos vendo."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ler a história" }),
    ).toBeVisible();
  });

  test("sem histórias: uma frase e um botão", async ({ page }) => {
    await page.goto("/styleguide/historias-vazia");
    await expect(page.getByText("Nenhuma história ainda.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Nova história" }),
    ).toBeVisible();
  });

  test("home: marco da 1ª história com Contar no grupo, que some com Agora não", async ({
    page,
  }) => {
    await page.goto("/styleguide/livro-com-historias");
    const marco = page.getByText("A primeira história do livro está pronta.");
    await expect(marco).toBeVisible();
    const contar = page.getByRole("link", { name: "Contar no grupo" });
    await expect(contar).toHaveAttribute("href", /wa\.me/);
    await page.getByRole("button", { name: "Agora não" }).click();
    await expect(marco).toBeHidden();
    await page.reload();
    await expect(marco).toBeHidden();
  });
});

test.describe("Ler a história (exemplo)", () => {
  test("tocar no grifo mostra o motivo do Confira", async ({ page }) => {
    await page.goto("/styleguide/historia");
    await expect(
      page.getByRole("heading", { name: "O trem de Cachoeiro" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /até hoje fico emocionado/ })
      .click();
    const folha = page.getByRole("dialog", { name: "Confira" });
    await expect(folha).toBeVisible();
    await expect(folha.getByText(/o autor não fala de emoção/)).toBeVisible();
    await expect(page.getByText("Para a próxima conversa")).toBeVisible();
  });
});

test.describe("Configurações (exemplo)", () => {
  test("sem confirmação: pede a confirmação da IA; sem nomes: frase e botão", async ({
    page,
  }) => {
    await page.goto("/styleguide/configuracoes-vazia");
    await expect(page.getByText("Antes da primeira história")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sim, pode processar" }),
    ).toBeVisible();
    await expect(
      page.getByText("Os nomes aparecem aqui depois da primeira história."),
    ).toBeVisible();
  });

  test("nome sugerido: aceitar, corrigir e acrescentar", async ({ page }) => {
    await page.goto("/styleguide/configuracoes");
    await expect(page.getByText("Antes da primeira história")).toBeHidden();
    await expect(page.getByRole("button", { name: "Aceitar" })).toHaveCount(2);
    await page.getByRole("button", { name: "Corrigir" }).first().click();
    await expect(page.getByLabel(/grafia certa/)).toHaveValue("Tião");
    await page.getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("button", { name: "Acrescentar nome" }).click();
    await expect(page.getByLabel("Nome, como deve ser escrito")).toBeVisible();
  });
});

test.describe("Áudios e admin (exemplo)", () => {
  test("cada áudio diz se virou história ou por que espera", async ({
    page,
  }) => {
    await page.goto("/styleguide/audios-situacao");
    await expect(
      page.getByRole("link", { name: "Virou história" }),
    ).toBeVisible();
    await expect(page.getByText("Aguardando divisão")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Aguardando sua confirmação" }),
    ).toHaveAttribute("href", /configuracoes#ia/);
  });

  test("admin mostra falhas com código, sem texto, e o custo por livro", async ({
    page,
  }) => {
    await page.goto("/styleguide/admin-processamento");
    await expect(
      page.getByRole("heading", { name: "Processamento" }),
    ).toBeVisible();
    await expect(page.getByText(/transcrever · scribe_falhou/)).toBeVisible();
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByText("Processando de novo.")).toBeVisible();
    await expect(page.getByText(/R\$ 2,47/)).toBeVisible();
  });
});
