import { expect, test } from "@playwright/test";

// App instalável e Compartilhar do Android (fase C do prompt 5).
test("manifest com share_target para áudios", async ({ request }) => {
  const r = await request.get("/manifest.webmanifest");
  expect(r.ok()).toBe(true);
  const m = await r.json();
  expect(m.start_url).toBe("/");
  expect(m.share_target).toMatchObject({
    action: "/compartilhar/receber",
    method: "POST",
    enctype: "multipart/form-data",
  });
  expect(m.share_target.params.files[0].accept).toContain(".opus");
  expect(m.icons.length).toBeGreaterThanOrEqual(2);
});

test("o atalho do autor abre o link dele, não o login", async ({ request }) => {
  const token = "v1_exemploAUTORexemplo000";
  const r = await request.get(`/a/${token}/manifest.webmanifest`);
  expect(r.ok()).toBe(true);
  expect((await r.json()).start_url).toBe(`/a/${token}`);
  expect((await request.get("/a/xx/manifest.webmanifest")).status()).toBe(404);
});

test("o service worker não fica em cache", async ({ request }) => {
  const r = await request.get("/sw.js");
  expect(r.ok()).toBe(true);
  expect(r.headers()["cache-control"]).toContain("no-store");
});

test("o service worker guarda os áudios compartilhados no aparelho", async ({
  page,
}) => {
  await page.goto("/entrar");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // a partir daqui a página é controlada pelo service worker
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  const destino = await page.evaluate(async () => {
    const dados = new FormData();
    dados.append(
      "audios",
      new File(["a"], "PTT-1.opus", { type: "audio/ogg" }),
    );
    dados.append(
      "audios",
      new File(["bb"], "PTT-2.opus", { type: "audio/ogg" }),
    );
    const r = await fetch("/compartilhar/receber", {
      method: "POST",
      body: dados,
    });
    return new URL(r.url).pathname;
  });
  // Sem sessão, /compartilhar manda para o login; os arquivos já estão guardados.
  expect(destino).toBe("/entrar");

  const nomes = await page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const r = indexedDB.open("ecoa-compartilhados", 1);
        r.onsuccess = () => {
          const q = r.result
            .transaction("arquivos")
            .objectStore("arquivos")
            .getAll();
          q.onsuccess = () => resolve((q.result as File[]).map((f) => f.name));
          q.onerror = () => reject(q.error);
        };
        r.onerror = () => reject(r.error);
      }),
  );
  expect(nomes).toEqual(["PTT-1.opus", "PTT-2.opus"]);
});

test("Compartilhar: os áudios chegam já escolhidos em Subir áudios", async ({
  page,
}) => {
  await page.goto("/styleguide/compartilhar");
  await expect(page.getByText("PTT-20261110-WA0007.opus")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enviar 2 áudios" }),
  ).toBeVisible();
  await page.goto("/styleguide/compartilhar-livros");
  await expect(
    page.getByRole("link", { name: "Livro do Dona Lurdes" }),
  ).toBeVisible();
});

// Quem aceita o convite cai na gravação com a oferta de pôr o Ecoa na tela inicial.
test.describe("pôr na tela inicial depois do convite", () => {
  test("iPhone: explica o caminho pelo Compartilhar e some com Entendi", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    });
    const page = await ctx.newPage();
    await page.goto("/styleguide/gravar-conversa-bemvindo");
    const dica = page.getByText("Adicionar à Tela de Início");
    await expect(dica).toBeVisible();
    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(dica).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("Sobre o que vão conversar?")).toBeVisible();
    await expect(dica).toHaveCount(0);
    await ctx.close();
  });

  test("Android: o botão abre o pedido do Chrome", async ({ page }) => {
    await page.goto("/styleguide/gravar-conversa-bemvindo");
    await expect(page.getByText("Sobre o que vão conversar?")).toBeVisible();
    // Sem pedido do navegador (computador), nada aparece.
    await expect(page.getByText("ponha o Ecoa na tela inicial")).toHaveCount(0);
    const botao = page.getByRole("button", { name: "Pôr na tela inicial" });
    // O Chrome manda o pedido depois que a página carrega; repete até a tela estar pronta.
    await expect(async () => {
      await page.evaluate(() => {
        const e = new Event("beforeinstallprompt") as Event & {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string }>;
        };
        e.prompt = async () => {
          (window as unknown as { pediu: boolean }).pediu = true;
        };
        e.userChoice = Promise.resolve({ outcome: "accepted" });
        window.dispatchEvent(e);
      });
      await expect(botao).toBeVisible({ timeout: 500 });
    }).toPass();
    await botao.click();
    await expect(page.getByText("ponha o Ecoa na tela inicial")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as unknown as { pediu: boolean }).pediu,
      ),
    ).toBe(true);
  });

  test("sem o convite, a gravação não oferece nada", async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    });
    const page = await ctx.newPage();
    await page.goto("/styleguide/gravar-conversa");
    await expect(page.getByText("Sobre o que vão conversar?")).toBeVisible();
    await expect(page.getByText("Adicionar à Tela de Início")).toHaveCount(0);
    await ctx.close();
  });
});
