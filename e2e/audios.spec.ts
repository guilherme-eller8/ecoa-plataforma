import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Arquivos de verdade no disco: o Playwright não aceita buffer acima de 50 MB.
function arquivos() {
  const pasta = mkdtempSync(path.join(tmpdir(), "ecoa-audios-"));
  const criar = (nome: string, bytes: number) => {
    const caminho = path.join(pasta, nome);
    writeFileSync(caminho, Buffer.alloc(bytes, 1));
    return caminho;
  };
  return [
    criar("PTT-20261109-WA0001.opus", 300 * 1024),
    criar("PTT-20261109-WA0002.opus", 200 * 1024),
    // sem acento: o setInputFiles do Playwright descarta "Gravação 12.m4a"
    criar("Gravacao 12.m4a", 900 * 1024),
    criar("conversa-longa.opus", 51 * 1024 * 1024),
  ];
}

test.describe("Nova história: subir áudios (exemplo)", () => {
  test("uma frase e um botão antes de escolher", async ({ page }) => {
    await page.goto("/styleguide/nova-historia");
    await expect(
      page.getByRole("heading", { name: "Nova história" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Subir áudios" }),
    ).toBeVisible();
  });

  test("recusa o arquivo acima de 50 MB, liga a pergunta e envia os outros", async ({
    page,
  }) => {
    await page.goto("/styleguide/nova-historia");
    await page.getByTestId("escolher-audios").setInputFiles(arquivos());

    await expect(
      page.getByText("«conversa-longa.opus» passa de 50 MB e não pode subir."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enviar 3 áudios" }),
    ).toBeVisible();

    const pergunta = page.getByLabel("Pergunta (opcional)").first();
    const opcao = await pergunta.locator("option").nth(1).textContent();
    await pergunta.selectOption({ label: opcao! });
    await page.getByRole("button", { name: "Dar um título" }).nth(2).click();
    await page.getByLabel("Título (opcional)").fill("Na roça");

    await page.getByRole("button", { name: "Enviar 3 áudios" }).click();
    await expect(page.getByText("Pronto. 3 áudios guardados.")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Guardado", { exact: true })).toHaveCount(3);
    await expect(
      page.getByRole("link", { name: "Ver áudios recebidos" }),
    ).toBeVisible();
  });

  test("mostra cada estado de envio", async ({ page }) => {
    await page.goto("/styleguide/nova-historia-arquivos");
    await expect(page.getByText("Enviando 45%")).toBeVisible();
    await expect(
      page.getByText(/«video-da-ceia.mp4» não é áudio/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enviar 2 áudios" }),
    ).toBeVisible();
  });
});

test.describe("Áudios recebidos (exemplo)", () => {
  test("lista com player, pergunta e selo, sem botão de apagar", async ({
    page,
  }) => {
    await page.goto("/styleguide/audios");
    await expect(page.getByText("3 áudios guardados")).toBeVisible();
    await expect(page.locator("audio")).toHaveCount(3);
    // Sem a situação do pipeline (prompt 6), cada áudio mostra só "Aguardando".
    await expect(page.getByText("Aguardando", { exact: true })).toHaveCount(3);
    await expect(page.getByText("O dia em que a ponte caiu")).toBeVisible();
    // sem título nem pergunta, o nome do arquivo não vira título
    await expect(page.getByText("Áudio de 8 de nov.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /apagar|excluir/i }),
    ).toHaveCount(0);
  });

  test("vazio: uma frase e um botão", async ({ page }) => {
    await page.goto("/styleguide/audios-vazia");
    await expect(page.getByText("Nenhum áudio ainda.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Subir áudios" }),
    ).toBeVisible();
  });
});

test("a home tem Nova história como ação principal", async ({ page }) => {
  await page.goto("/styleguide/livro");
  await expect(page.getByRole("link", { name: "Nova história" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "3 áudios recebidos" }),
  ).toBeVisible();
});
