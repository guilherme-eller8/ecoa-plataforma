// Service worker do Ecoa. Faz uma coisa só: recebe os áudios do Compartilhar do Android
// (share_target do manifest), guarda no IndexedDB do aparelho e abre /compartilhar.
// Não guarda páginas em cache: sem modo offline nesta etapa.
const BANCO = "ecoa-compartilhados";
const LOJA = "arquivos";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

function abrir() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore(LOJA, { autoIncrement: true });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function guardar(arquivos) {
  const db = await abrir();
  await new Promise((resolve, reject) => {
    const t = db.transaction(LOJA, "readwrite");
    const loja = t.objectStore(LOJA);
    loja.clear();
    for (const a of arquivos) loja.add(a);
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "POST" || url.pathname !== "/compartilhar/receber")
    return;
  e.respondWith(
    (async () => {
      try {
        const dados = await e.request.formData();
        const arquivos = dados
          .getAll("audios")
          .filter((a) => a instanceof File);
        await guardar(arquivos);
        return Response.redirect("/compartilhar", 303);
      } catch {
        return Response.redirect("/compartilhar?erro=1", 303);
      }
    })(),
  );
});
