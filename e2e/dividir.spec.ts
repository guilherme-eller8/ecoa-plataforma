import { expect, test } from "@playwright/test";

// Prompt 7: Confira as histórias. Tela de exemplo (sem Supabase): uma ceia em 2 partes que a
// IA dividiu em 3 histórias. O confirmar falso guarda a carga em window.__confirmado.

type Carga = {
  historias: {
    titulo: string | null;
    segmentos: number[];
    prompt_id: string | null;
  }[];
  ajustes: { juntou: number; separou: number; tirou: number; renomeou: number };
};

test.describe("Confira as histórias (exemplo)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/styleguide/dividir");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("mostra as 3 histórias, os trechos e a dica uma vez só", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "3 histórias" }),
    ).toBeVisible();
    await expect(page.getByText("A escola da dona Cotinha")).toBeVisible();
    await expect(page.getByText(/Juntar une com a de baixo/)).toBeVisible();
    await page.getByRole("button", { name: "Entendi" }).click();
    await page.reload();
    await expect(page.getByText(/Juntar une com a de baixo/)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Escrever 3 histórias" }),
    ).toBeVisible();
  });

  test("juntar, separar, tirar com desfazer e renomear; a carga vai em ordem", async ({
    page,
  }) => {
    // Juntar a 1ª com a 2ª: ficam 2.
    await page
      .getByRole("button", { name: "Juntar com a de baixo" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "2 histórias" }),
    ).toBeVisible();

    // Separar a última no 2º trecho: voltam a ser 3.
    await page
      .getByRole("button", { name: "Separar", exact: true })
      .last()
      .click();
    await page.getByRole("button", { name: "Separar aqui" }).first().click();
    await expect(
      page.getByRole("heading", { name: "3 histórias" }),
    ).toBeVisible();

    // Tirar um trecho e desfazer.
    await page
      .getByRole("button", { name: /^Tirar o trecho/ })
      .first()
      .click();
    await expect(page.getByText(/Trecho fora das histórias/)).toBeVisible();
    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByText(/Trecho fora das histórias/)).toHaveCount(0);

    // Renomear a 1ª.
    await page
      .getByRole("button", { name: /^Renomear:/ })
      .first()
      .click();
    await page.getByLabel("Título", { exact: true }).fill("Roça e escola");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Roça e escola")).toBeVisible();

    await page.getByRole("button", { name: "Escrever 3 histórias" }).click();
    await expect(page.getByText("Exemplo: nada foi enviado.")).toBeVisible();
    const carga = (await page.evaluate(
      () => (window as unknown as { __confirmado: unknown }).__confirmado,
    )) as Carga;
    expect(carga.historias[0].titulo).toBe("Roça e escola");
    expect(carga.historias[0].segmentos).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(carga.historias.flatMap((h) => h.segmentos)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
    expect(carga.ajustes).toEqual({
      juntou: 1,
      separou: 1,
      tirou: 0,
      renomeou: 1,
    });
  });

  test("sugestão de pergunta: marcar como respondida vira pergunta da história", async ({
    page,
  }) => {
    await expect(page.getByText(/Parece responder/)).toBeVisible();
    await page.getByRole("button", { name: "Marcar como respondida" }).click();
    await expect(
      page.getByText(
        "Responde: Como era a escola quando o senhor era criança?",
      ),
    ).toBeVisible();
  });

  test("os ajustes continuam depois de recarregar (rascunho no aparelho)", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: "Juntar com a de baixo" })
      .first()
      .click();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "2 histórias" }),
    ).toBeVisible();
  });

  test("tudo tirado: uma frase, Recomeçar e Deixar fora do livro", async ({
    page,
  }) => {
    const tirar = page.getByRole("button", { name: /^Tirar o trecho/ });
    while ((await tirar.count()) > 0) await tirar.first().click();
    await expect(page.getByText("Nenhum trecho sobrou.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Deixar fora do livro" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Recomeçar" }).click();
    await expect(
      page.getByRole("heading", { name: "3 histórias" }),
    ).toBeVisible();
  });
});

test("divisão já confirmada: uma frase e um botão", async ({ page }) => {
  await page.goto("/styleguide/dividir-confirmada");
  await expect(
    page.getByText("Estas histórias já foram para a escrita."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver histórias" })).toBeVisible();
});

test("home: cartão em conferir com o botão, e outro separando", async ({
  page,
}) => {
  await page.goto("/styleguide/livro-conferir");
  await expect(page.getByText("3 histórias para conferir")).toBeVisible();
  await expect(page.getByText("Confira antes de escrever.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Conferir" })).toHaveAttribute(
    "href",
    /\/historias\/.+\/dividir$/,
  );
  await expect(page.getByText(/Separando as histórias/).first()).toBeVisible();
  await expect(page.getByText("8 áudios").first()).toBeVisible();
});

test("leitura: sugestão de pergunta com os dois botões", async ({ page }) => {
  await page.goto("/styleguide/historia-sugestao");
  await expect(page.getByText(/Parece responder/)).toBeVisible();
  await page.getByRole("button", { name: "Ignorar" }).click();
  await expect(page.getByText(/Parece responder/)).toHaveCount(0);
});
