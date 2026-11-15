import { expect, test } from "@playwright/test";

test.describe("Admin: aderência e erros (exemplo)", () => {
  test("lista os livros do mais parado para o menos e diz o que o autor fez", async ({
    page,
  }) => {
    await page.goto("/styleguide/admin-aderencia");
    const itens = page
      .getByRole("listitem")
      .filter({ hasText: /Passo|passos feitos/ });
    await expect(itens.first()).toContainText("Dona Lurdes");
    await expect(itens.first()).toContainText("Parado há 12 dias");
    await expect(itens.first()).toContainText("Autor ainda não abriu o link");
    await expect(
      page.getByText("Autor abriu o link, ainda não gravou"),
    ).toBeVisible();
    await expect(page.getByText("Autor já gravou")).toBeVisible();
    // Publicado ainda não existe (prompt 13): traço, nunca zero inventado.
    await expect(page.getByText("Publicado")).toBeVisible();
  });

  test("sem livro, uma frase e um botão", async ({ page }) => {
    await page.goto("/styleguide/admin-aderencia-vazia");
    await expect(page.getByText("Nenhum livro ainda.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ativar um plano" }),
    ).toBeVisible();
  });

  test("um livro mostra quem entrou e a linha do tempo", async ({ page }) => {
    await page.goto("/styleguide/admin-aderencia-livro");
    await expect(page.getByRole("heading", { name: "Jair" })).toBeVisible();
    await expect(page.getByText("ana.souza@gmail.com").first()).toBeVisible();
    await expect(page.getByText("O autor deu o consentimento")).toBeVisible();
  });

  test("erros mostram job e rota, só com ids e padrão de rota", async ({
    page,
  }) => {
    await page.goto("/styleguide/admin-erros");
    await expect(
      page.getByText("ecoa-plataforma-processar-gravacao"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Abrir no Inngest" }).first(),
    ).toHaveAttribute(
      "href",
      /app\.inngest\.com\/env\/production\/runs\/01JABCDEF/,
    );
    await expect(page.getByText("/a/[token]")).toBeVisible();
    await expect(page.getByText("3 em 24 h · 5 em 7 dias")).toBeVisible();
  });

  test("sem erro, a frase diz isso", async ({ page }) => {
    await page.goto("/styleguide/admin-erros-vazio");
    await expect(
      page.getByText(/Nenhum erro nos últimos 30 dias/),
    ).toBeVisible();
  });
});
