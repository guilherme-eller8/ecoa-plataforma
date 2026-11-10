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
