// Fila de envio das gravações guardadas no aparelho (T30). Sem React e sem rede direta:
// quem chama passa o adaptador do destino (autor ou responsável) e a função de upload (TUS).
// A gravação só sai do aparelho depois que o servidor confirma o arquivo inteiro.
import type { AudioPreparado } from "@/lib/livro/tipos";
import { juntar, type Armazem, type GravacaoLocal } from "./local";

export type CodigoEnvio = "expirada" | "link_invalido" | "limite" | "recebida";

export type RespostaEnvio<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { dados: T }))
  | { ok: false; mensagem: string; codigo?: CodigoEnvio };

/** O que o servidor devolve ao preparar: token null quando a gravação já foi recebida. */
export type Preparo = {
  id: string;
  caminho: string;
  contentType: string;
  token: string | null;
  recebida: boolean;
};

export type AdaptadorEnvio = {
  preparar: (
    g: GravacaoLocal,
    tamanho: number,
  ) => Promise<RespostaEnvio<Preparo>>;
  /** Token novo para o mesmo caminho (o token vale 2 h). */
  assinar: (g: GravacaoLocal) => Promise<RespostaEnvio<AudioPreparado>>;
  confirmar: (g: GravacaoLocal) => Promise<RespostaEnvio>;
};

export type SubirBlob = (
  blob: Blob,
  p: AudioPreparado,
  aoProgresso: (fracao: number) => void,
  impressao: string,
) => Promise<void>;

export type FimEnvio = "enviada" | "vazia" | "parada" | "falhou" | "ausente";

/**
 * Toda gravação que morreu no meio (aba fechada, bateria) vira "pronta" (P38), com a duração
 * contada pelos pedaços (1 por segundo). Sem nenhum pedaço, não há o que guardar.
 */
export async function recuperar(a: Armazem): Promise<GravacaoLocal[]> {
  const todas = await a.listar();
  const vivas: GravacaoLocal[] = [];
  for (const g of todas) {
    if (g.estado === "gravando") {
      const n = (await a.pedacos(g.id)).length;
      if (!n) {
        await a.apagar(g.id);
        continue;
      }
      g.estado = "pronta";
      g.segundos = Math.max(g.segundos, n);
      await a.salvar(g);
    }
    vivas.push(g);
  }
  return vivas;
}

export async function enviarGravacao(
  id: string,
  deps: {
    armazem: Armazem;
    adaptador: AdaptadorEnvio;
    subir: SubirBlob;
    aoProgresso?: (fracao: number) => void;
    novoId?: () => string;
  },
  jaRefez = false,
): Promise<{ fim: FimEnvio; mensagem?: string }> {
  const { armazem: a, adaptador } = deps;
  const g = await a.ler(id);
  if (!g || g.estado === "enviada") return { fim: "ausente" };
  const blob = await juntar(a, g);
  if (!blob.size) {
    await a.apagar(g.id);
    return { fim: "vazia" };
  }
  g.estado = "enviando";
  await a.salvar(g);

  async function falha(r: { mensagem: string; codigo?: CodigoEnvio }) {
    if (r.codigo === "recebida") {
      // O servidor já tem o arquivo inteiro (a confirmação anterior se perdeu na volta).
      await a.apagar(g!.id);
      return { fim: "enviada" as const };
    }
    if (r.codigo === "link_invalido") {
      g!.estado = "parada";
      await a.salvar(g!);
      return { fim: "parada" as const, mensagem: r.mensagem };
    }
    if (r.codigo === "expirada" && !jaRefez) {
      // A linha no servidor venceu: id novo, mesmo arquivo.
      g!.idServidor = (deps.novoId ?? (() => crypto.randomUUID()))();
      g!.preparado = null;
      await a.salvar(g!);
      return enviarGravacao(id, deps, true);
    }
    return { fim: "falhou" as const, mensagem: r.mensagem };
  }

  let destino: AudioPreparado;
  if (!g.preparado) {
    const r = await adaptador.preparar(g, blob.size);
    if (!r.ok) return falha(r);
    g.preparado = {
      id: r.dados.id,
      caminho: r.dados.caminho,
      contentType: r.dados.contentType,
    };
    g.idServidor = r.dados.id;
    await a.salvar(g);
    if (r.dados.recebida) {
      await a.apagar(g.id);
      return { fim: "enviada" };
    }
    if (!r.dados.token) return { fim: "falhou" };
    destino = { ...g.preparado, token: r.dados.token };
  } else {
    const r = await adaptador.assinar(g);
    if (!r.ok) return falha(r);
    destino = r.dados;
  }

  try {
    await deps.subir(
      blob,
      destino,
      deps.aoProgresso ?? (() => {}),
      g.idServidor,
    );
  } catch {
    return { fim: "falhou", mensagem: "Sem internet agora." };
  }
  const c = await adaptador.confirmar(g);
  if (!c.ok) return falha(c);
  await a.apagar(g.id);
  return { fim: "enviada" };
}
