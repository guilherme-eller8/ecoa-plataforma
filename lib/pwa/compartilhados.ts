// Áudios que o service worker guardou ao receber o Compartilhar do Android. Só navegador.
// Lidos uma vez e apagados: continuam no WhatsApp se a pessoa desistir.
const BANCO = "ecoa-compartilhados";
const LOJA = "arquivos";

export async function lerCompartilhados(): Promise<File[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore(LOJA, { autoIncrement: true });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return new Promise((resolve, reject) => {
    const t = db.transaction(LOJA, "readwrite");
    const loja = t.objectStore(LOJA);
    const pedido = loja.getAll();
    pedido.onsuccess = () => {
      loja.clear();
      resolve(
        (pedido.result as unknown[]).filter(
          (a): a is File => a instanceof File,
        ),
      );
    };
    pedido.onerror = () => reject(pedido.error);
  });
}
