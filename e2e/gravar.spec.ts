import { expect, test, type Page } from "@playwright/test";

// Modo conversa com microfone falso do Chromium. A gravação vai para o IndexedDB de verdade;
// só o envio é falso (SUBIR_FALSO), e ele falha quando o navegador está offline.
test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
});

async function gravarPor(page: Page, ms: number) {
  await page.getByRole("button", { name: "Gravar" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.waitForTimeout(ms);
}

test.beforeEach(async ({ page }) => {
  page.on("dialog", (d) => void d.accept());
});

test("Nova história oferece Gravar conversa e Subir áudios", async ({
  page,
}) => {
  await page.goto("/styleguide/nova-historia");
  await expect(
    page.getByRole("link", { name: "Gravar conversa" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Subir áudios" }),
  ).toBeVisible();
});

test("escolhe a pergunta, grava, pausa, retoma, ouve e envia", async ({
  page,
}) => {
  await page.goto("/styleguide/gravar-conversa");
  await page
    .getByRole("button", { name: "Conversa livre, sem pergunta" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conversa livre" }),
  ).toBeVisible();

  await gravarPor(page, 2500);
  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(page.getByRole("timer")).toHaveAccessibleName(/^Pausado/);
  await page.getByRole("button", { name: "Continuar gravando" }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Concluir" }).click();

  await expect(page.locator("audio")).toHaveCount(1);
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Pronto. A gravação chegou.")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByRole("link", { name: "Ver áudios recebidos" }),
  ).toBeVisible();
});

test("a aba recarregada no meio da gravação não perde nada", async ({
  page,
}) => {
  await page.goto("/styleguide/gravar-conversa-pergunta");
  await gravarPor(page, 3000);
  await page.reload();

  await expect(
    page.getByText(/Achamos uma gravação de \d+ s que não foi enviada\./),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Pronto. A gravação chegou.")).toBeVisible({
    timeout: 10_000,
  });
});

test("sem internet no envio: fica guardada e sobe sozinha quando volta", async ({
  page,
  context,
}) => {
  await page.goto("/styleguide/gravar-conversa-pergunta");
  await gravarPor(page, 2000);
  await page.getByRole("button", { name: "Concluir" }).click();

  await context.setOffline(true);
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(
    page.getByText(
      "Sem internet agora. Sua gravação está guardada e sobe sozinha.",
    ),
  ).toBeVisible({ timeout: 10_000 });

  await context.setOffline(false);
  await expect(page.getByText("Pronto. A gravação chegou.")).toBeVisible({
    timeout: 15_000,
  });
});

test("Gravar de novo apaga e volta ao começo", async ({ page }) => {
  await page.goto("/styleguide/gravar-conversa-pergunta");
  await gravarPor(page, 1500);
  await page.getByRole("button", { name: "Concluir" }).click();
  await page.getByRole("button", { name: "Gravar de novo" }).click();
  await expect(page.getByRole("button", { name: "Gravar" })).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Achamos uma gravação/)).toHaveCount(0);
});

test("conversa longa: troca de parte sem parar o microfone (parte de 3 s no exemplo)", async ({
  page,
}) => {
  await page.goto("/styleguide/gravar-conversa-partes");
  await gravarPor(page, 7500);
  await expect(page.getByRole("timer")).toHaveAccessibleName(/^Gravando/);
  await page.getByRole("button", { name: "Concluir" }).click();
  await expect(page.getByText("Parte 1 de 3")).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(3);
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Pronto. A gravação chegou.")).toBeVisible({
    timeout: 15_000,
  });
});
