// Gravações guardadas no aparelho até o servidor confirmar (T30). Só navegador.
// Duas implementações da mesma interface: IndexedDB (de verdade) e memória (testes, styleguide).
import type { ExtGravacao } from "./gravador";

export type EstadoGravacao =
  "gravando" | "pronta" | "enviando" | "enviada" | "parada";

export type DestinoGravacao =
  { tipo: "livro"; livroId: string } | { tipo: "autor"; token: string };

export type GravacaoLocal = {
  id: string; // uuid local (chave dos pedaços)
  idServidor: string; // id da linha no servidor e impressão digital do TUS; muda se a linha vencer
  destino: DestinoGravacao;
  promptId: string | null;
  loteId: string | null; // partes da mesma conversa (P39)
  parte: number; // 1, 2, …
  totalPartes?: number; // prompt 7: partes da conversa; gravado ao tocar Enviar (antigas: sem)
  mime: string;
  ext: ExtGravacao;
  segundos: number;
  estado: EstadoGravacao;
  preparado: { id: string; caminho: string; contentType: string } | null;
  criadaEm: number;
};

export interface Armazem {
  salvar(g: GravacaoLocal): Promise<void>;
  ler(id: string): Promise<GravacaoLocal | null>;
  listar(): Promise<GravacaoLocal[]>;
  /** Apaga a gravação e os pedaços. */
  apagar(id: string): Promise<void>;
  adicionarPedaco(id: string, seq: number, pedaco: Blob): Promise<void>;
  pedacos(id: string): Promise<Blob[]>;
}

export async function juntar(a: Armazem, g: GravacaoLocal): Promise<Blob> {
  return new Blob(await a.pedacos(g.id), { type: g.mime });
}

// ── Memória ──────────────────────────────────────────────────────────────

export function armazemMemoria(): Armazem {
  const gravacoes = new Map<string, GravacaoLocal>();
  const pedacos = new Map<string, Map<number, Blob>>();
  return {
    async salvar(g) {
      gravacoes.set(g.id, { ...g });
    },
    async ler(id) {
      const g = gravacoes.get(id);
      return g ? { ...g } : null;
    },
    async listar() {
      return [...gravacoes.values()]
        .map((g) => ({ ...g }))
        .sort((x, y) => x.criadaEm - y.criadaEm);
    },
    async apagar(id) {
      gravacoes.delete(id);
      pedacos.delete(id);
    },
    async adicionarPedaco(id, seq, pedaco) {
      if (!pedacos.has(id)) pedacos.set(id, new Map());
      pedacos.get(id)!.set(seq, pedaco);
    },
    async pedacos(id) {
      const m = pedacos.get(id);
      if (!m) return [];
      return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b);
    },
  };
}

// ── IndexedDB ────────────────────────────────────────────────────────────

const BANCO = "ecoa-gravacoes";
const GRAVACOES = "gravacoes";
const PEDACOS = "pedacos";

function pedido<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function concluida(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error("transação abortada"));
  });
}

let aberto: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  aberto ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore(GRAVACOES, { keyPath: "id" });
      db.createObjectStore(PEDACOS, { keyPath: ["gravacaoId", "seq"] });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => {
      aberto = null;
      reject(r.error);
    };
  });
  return aberto;
}

export function armazemIndexedDb(): Armazem {
  return {
    async salvar(g) {
      const db = await abrir();
      const t = db.transaction(GRAVACOES, "readwrite");
      t.objectStore(GRAVACOES).put(g);
      await concluida(t);
    },
    async ler(id) {
      const db = await abrir();
      return (
        (await pedido(
          db.transaction(GRAVACOES).objectStore(GRAVACOES).get(id),
        )) ?? null
      );
    },
    async listar() {
      const db = await abrir();
      const todas: GravacaoLocal[] = await pedido(
        db.transaction(GRAVACOES).objectStore(GRAVACOES).getAll(),
      );
      return todas.sort((x, y) => x.criadaEm - y.criadaEm);
    },
    async apagar(id) {
      const db = await abrir();
      const t = db.transaction([GRAVACOES, PEDACOS], "readwrite");
      t.objectStore(GRAVACOES).delete(id);
      t.objectStore(PEDACOS).delete(
        IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]),
      );
      await concluida(t);
    },
    async adicionarPedaco(id, seq, pedaco) {
      const db = await abrir();
      const t = db.transaction(PEDACOS, "readwrite");
      t.objectStore(PEDACOS).put({ gravacaoId: id, seq, pedaco });
      await concluida(t);
    },
    async pedacos(id) {
      const db = await abrir();
      const linhas: { pedaco: Blob }[] = await pedido(
        db
          .transaction(PEDACOS)
          .objectStore(PEDACOS)
          .getAll(IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER])),
      );
      return linhas.map((l) => l.pedaco);
    },
  };
}

/** Pede ao navegador para não apagar o que está guardado (o Safari apaga em 7 dias sem uso). */
export async function pedirPersistencia() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
