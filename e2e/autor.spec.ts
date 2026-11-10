import { expect, test, type Page } from "@playwright/test";

// Área do autor (exemplo no styleguide) e a rota de verdade sem token válido.
test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
});

test.beforeEach(async ({ page }) => {
  page.on("dialog", (d) => void d.accept());
});

async function gravarPor(page: Page, ms: number) {
  await page.getByRole("button", { name: "Gravar" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.waitForTimeout(ms);
}

test("primeira abertura: uma frase, o consentimento e um botão", async ({
  page,
}) => {
  await page.goto("/styleguide/autor-primeira");
  await expect(
    page.getByText("Toque no círculo e conte. Pode pausar quando quiser."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sim, pode guardar" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Jair" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Contar uma história" }),
  ).toBeVisible();
});

test("início: perguntas enviadas com quem pediu; vazio tem uma frase", async ({
  page,
}) => {
  await page.goto("/styleguide/autor-inicio");
  await expect(page.getByText("Ana pediu")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /primeira escola/ }),
  ).toHaveAttribute("href", /\/a\/v1_.+\/gravar\/[0-9a-f-]{36}$/);
  await page.goto("/styleguide/autor-inicio-vazio");
  await expect(page.getByText("Nenhuma pergunta por enquanto.")).toBeVisible();
});

test("responde a uma pergunta: grava, ouve e envia", async ({ page }) => {
  await page.goto("/styleguide/autor-gravar");
  await expect(page.getByRole("heading", { name: /Guarapari/ })).toBeVisible();
  await expect(page.getByText("Ana pediu:")).toBeVisible();
  await gravarPor(page, 2000);
  await page.getByRole("button", { name: "Concluir" }).click();
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Pronto. A gravação chegou.")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByRole("link", { name: "Voltar ao início" }),
  ).toBeVisible();
});

test("link inválido: frase clara, sem detalhe técnico", async ({ page }) => {
  const r = await page.goto("/a/nao-e-um-token");
  expect(r?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(r?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    page.getByRole("heading", { name: "Este link não vale mais." }),
  ).toBeVisible();
});
