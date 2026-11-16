import { expect, test } from "@playwright/test";

test.describe("Admin: Evals 1A (exemplo)", () => {
  test("custo e tempo: números de 30 dias, projeção e primeira palavra", async ({
    page,
  }) => {
    await page.goto("/styleguide/admin-evals");
    await expect(page.getByRole("link", { name: "Evals" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText("Por minuto de áudio")).toBeVisible();
    await expect(page.getByText("meta R$ 0,20", { exact: false })).toBeVisible();
    await expect(page.getByText("Sem trocar o tamanho")).toBeVisible();
    await expect(page.getByText("2 trocas por história")).toBeVisible();
    await expect(page.getByText("Áudio até 5 min")).toBeVisible();
    await expect(page.getByText(/Fila parada .*: 1/)).toBeVisible();
    await expect(page.getByText("json_invalido")).toBeVisible();
  });

  test("custo sem uso: uma frase e um botão", async ({ page }) => {
    await page.goto("/styleguide/admin-evals-vazio");
    await expect(
      page.getByText("Nenhum uso de IA nos últimos 30 dias."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver os livros" })).toBeVisible();
  });

  test("adoção: amostra pequena em vez de percentual e quem precisa de conversa", async ({
    page,
  }) => {
    await page.goto("/styleguide/admin-evals-adocao");
    const conversar = page.getByRole("link", { name: /Dona Lurdes/ });
    await expect(conversar).toHaveAttribute(
      "href",
      "/admin/aderencia/1df99541-1bf8-402d-b4ae-658cfb163808",
    );
    await expect(page.getByText("1 de 3")).toBeVisible();
    await expect(page.getByText(/amostra pequena/).first()).toBeVisible();
    // Com menos de 5 livros, nenhuma taxa vira percentual.
    await expect(page.getByText(/^\d+%$/)).toHaveCount(0);
    await expect(
      page.getByRole("columnheader", { name: "S4" }),
    ).toBeVisible();
  });

  test("adoção sem livro: uma frase e um botão", async ({ page }) => {
    await page.goto("/styleguide/admin-evals-adocao-vazia");
    await expect(
      page.getByText("Nenhum livro com plano ativo ainda."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ativar um plano" }),
    ).toBeVisible();
  });

  test("cliente: plano, uso e custo na página do livro", async ({ page }) => {
    await page.goto("/styleguide/admin-aderencia-livro");
    await expect(page.getByRole("heading", { name: "Cliente" })).toBeVisible();
    await expect(page.getByText("Custo de IA")).toBeVisible();
    await expect(page.getByText("R$ 1,35")).toBeVisible();
    await expect(page.getByText(/IA confirmada em/)).toBeVisible();
  });

  test("início do admin: abrir o admin ou um dos próprios livros", async ({
    page,
  }) => {
    await page.goto("/styleguide/inicio-admin");
    await expect(page.getByRole("link", { name: "Abrir o admin" })).toHaveAttribute(
      "href",
      "/admin",
    );
    await expect(page.getByRole("link", { name: /Jair/ })).toHaveAttribute(
      "href",
      "/livro/f3a99a94",
    );
    await expect(page.getByText("Você é o responsável")).toBeVisible();
  });
});
