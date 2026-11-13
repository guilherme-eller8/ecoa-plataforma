import { expect, test, type Page } from "@playwright/test";

// Prompt 9: propostas da IA no editor, com dados de exemplo (sem Supabase nem IA). O 2º
// parágrafo foi editado à mão e fica travado. A garantia no banco está em
// supabase/tests/propostas.test.ts; no pipeline, em lib/pipeline/propostas.test.ts.

const P2 =
  "Não deu certo. Cheguei e o homem da oficina falou que a vaga já era de outro. Dormi na rodoviária, com a mala de travesseiro.";

async function textoDoEditor(page: Page) {
  return page.locator(".ProseMirror p").allInnerTexts();
}

test.describe("IA sob controle (exemplo)", () => {
  test("proposta de tamanho: diferença, travado com cadeado, aceitar tudo; o 2º continua idêntico", async ({
    page,
  }) => {
    await page.goto("/styleguide/editor-proposta");
    await expect(page.locator(".ProseMirror")).toHaveAttribute(
      "contenteditable",
      "true",
    );
    await expect(
      page.getByText("Texto longo: pronto para conferir."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Ver", exact: true }).click();

    const proposta = page.getByRole("region", { name: "Proposta da IA" });
    await expect(
      proposta.getByText("Editado à mão · fica como está"),
    ).toBeVisible();
    await expect(proposta.locator("ins").first()).toBeVisible();
    await expect(proposta.locator("del").first()).toBeVisible();
    await proposta.getByRole("button", { name: "Aceitar tudo" }).click();

    await expect(
      page.getByText(/O texto de antes ficou no histórico/),
    ).toBeVisible();
    const texto = await textoDoEditor(page);
    expect(texto[1]).toBe(P2);
    expect(texto[0]).toContain("sem conhecer ninguém lá");
    // Aceitar não é editar: nada fica "Salvando" depois.
    await expect(page.getByText("Salvando…")).toHaveCount(0);
  });

  test("escolher por parágrafo: a mudança recusada fica como estava", async ({
    page,
  }) => {
    await page.goto("/styleguide/editor-proposta");
    await page.getByRole("button", { name: "Ver", exact: true }).click();
    const proposta = page.getByRole("region", { name: "Proposta da IA" });
    await proposta
      .getByRole("button", { name: "Não quero esta" })
      .last()
      .click();
    await proposta.getByRole("button", { name: /Aceitar 1 de 2/ }).click();
    await expect(
      page.getByText(/O texto de antes ficou no histórico/),
    ).toBeVisible();
    const texto = await textoDoEditor(page);
    expect(texto[1]).toBe(P2);
    expect(texto[2]).toBe(
      "No outro dia o Tião, meu primo, me arrumou um bico de ajudante de pedreiro. Fiquei três anos lá.",
    );
  });

  test("descartar volta ao texto sem mudar nada", async ({ page }) => {
    await page.goto("/styleguide/editor-proposta");
    await expect(page.locator(".ProseMirror")).toHaveAttribute(
      "contenteditable",
      "true",
    );
    const antes = await textoDoEditor(page);
    await page.getByRole("button", { name: "Ver", exact: true }).click();
    await page
      .getByRole("region", { name: "Proposta da IA" })
      .getByRole("button", { name: "Descartar" })
      .click();
    await expect(
      page.getByRole("region", { name: "Proposta da IA" }),
    ).toHaveCount(0);
    expect(await textoDoEditor(page)).toEqual(antes);
  });

  test("tamanho: soltar o controle pede a proposta, que chega pronta para conferir", async ({
    page,
  }) => {
    await page.goto("/styleguide/editor-ia");
    await expect(page.locator(".ProseMirror")).toHaveAttribute(
      "contenteditable",
      "true",
    );
    await page.getByRole("button", { name: /Tamanho · Médio/ }).click();
    const folha = page.getByRole("dialog", { name: "Tamanho do texto" });
    await expect(
      folha.getByText("1 parágrafo editado à mão fica como está"),
    ).toBeVisible();
    await folha.getByRole("slider").fill("4");
    await expect(folha.getByText(/Escrevendo o texto longo/)).toBeVisible();
    await folha.getByRole("button", { name: "Fechar" }).click();
    await expect(
      page.getByText("Texto longo: pronto para conferir."),
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("revisar trecho: selecionar, Corrigir, e o parágrafo muda só no trecho", async ({
    page,
  }) => {
    await page.goto("/styleguide/editor-ia");
    const p1 = page.locator(".ProseMirror p").first();
    await expect(page.locator(".ProseMirror")).toHaveAttribute(
      "contenteditable",
      "true",
    );
    // Seleciona "ainda escuro" pelo teclado.
    await p1.click({ position: { x: 2, y: 10 } });
    await page.keyboard.press("Home");
    const inicio = "Eu tinha dezoito anos quando peguei o trem em Cachoeiro, "
      .length;
    for (let i = 0; i < inicio; i++) await page.keyboard.press("ArrowRight");
    for (let i = 0; i < "ainda escuro".length; i++)
      await page.keyboard.press("Shift+ArrowRight");
    await page.getByRole("button", { name: "Revisar" }).click();
    const folha = page.getByRole("dialog", { name: "Revisar o trecho" });
    await expect(folha.getByText("ainda escuro")).toBeVisible();
    await folha.getByRole("button", { name: "Corrigir" }).click();

    const proposta = page.getByRole("region", { name: "Proposta da IA" });
    await expect(proposta.getByText("Trecho revisado")).toBeVisible();
    await proposta.getByRole("button", { name: "Aceitar tudo" }).click();
    await expect(
      page.getByText(/O texto de antes ficou no histórico/),
    ).toBeVisible();
    const texto = await textoDoEditor(page);
    expect(texto[0]).toContain("trem em Cachoeiro, cedinho.");
    expect(texto[1]).toBe(P2);
  });

  test("acrescentar áudio: gravar mais ou subir mais um", async ({ page }) => {
    await page.goto("/styleguide/editor-ia");
    await expect(page.locator(".ProseMirror")).toHaveAttribute(
      "contenteditable",
      "true",
    );
    const aba = page.getByRole("tab", { name: "Áudio" });
    if (await aba.isVisible()) await aba.click();
    await page.getByRole("button", { name: "Acrescentar áudio" }).click();
    const folha = page.getByRole("dialog", { name: "Acrescentar áudio" });
    await expect(
      folha.getByRole("link", { name: "Gravar mais sobre isso" }),
    ).toHaveAttribute("href", /\/historias\/.+\/gravar$/);
    await expect(
      folha.getByRole("button", { name: "Subir mais um áudio" }),
    ).toBeVisible();
  });

  test("gravar mais: o gravador com o título da história", async ({ page }) => {
    await page.goto("/styleguide/gravar-mais");
    await expect(
      page.getByRole("heading", { name: "O trem de Cachoeiro" }),
    ).toBeVisible();
    await expect(page.getByText("Mais sobre")).toBeVisible();
  });
});
