import { describe, expect, it, vi } from "vitest";
import type { AdaptadorEnvio, SubirBlob } from "./envio";
import { enviarGravacao, recuperar } from "./envio";
import { armazemMemoria, type GravacaoLocal } from "./local";

function gravacao(extra: Partial<GravacaoLocal> = {}): GravacaoLocal {
  return {
    id: "g1",
    idServidor: "g1",
    destino: { tipo: "livro", livroId: "l1" },
    promptId: null,
    loteId: "lote",
    parte: 1,
    mime: "audio/webm",
    ext: "webm",
    segundos: 12,
    estado: "pronta",
    preparado: null,
    criadaEm: 1,
    ...extra,
  };
}

async function comPedacos(extra: Partial<GravacaoLocal> = {}) {
  const armazem = armazemMemoria();
  await armazem.salvar(gravacao(extra));
  await armazem.adicionarPedaco("g1", 1, new Blob(["mundo"]));
  await armazem.adicionarPedaco("g1", 0, new Blob(["ola "]));
  return armazem;
}

function adaptador(extra: Partial<AdaptadorEnvio> = {}): AdaptadorEnvio {
  return {
    preparar: vi.fn(async (g) => ({
      ok: true as const,
      dados: {
        id: g.idServidor,
        caminho: `livros/l1/audios/${g.idServidor}.webm`,
        contentType: "audio/webm",
        token: "t",
        recebida: false,
      },
    })),
    assinar: vi.fn(async (g) => ({
      ok: true as const,
      dados: {
        id: g.idServidor,
        caminho: g.preparado!.caminho,
        contentType: "audio/webm",
        token: "t2",
      },
    })),
    confirmar: vi.fn(async () => ({ ok: true as const })),
    ...extra,
  };
}

describe("enviarGravacao", () => {
  it("junta os pedaços em ordem, sobe, confirma e apaga do aparelho", async () => {
    const armazem = await comPedacos();
    const enviados: string[] = [];
    const subir: SubirBlob = async (blob, _p, _pr, impressao) => {
      enviados.push((await blob.text()) + "|" + impressao);
    };
    const r = await enviarGravacao("g1", {
      armazem,
      adaptador: adaptador(),
      subir,
    });
    expect(r.fim).toBe("enviada");
    expect(enviados).toEqual(["ola mundo|g1"]);
    expect(await armazem.ler("g1")).toBeNull();
  });

  it("sem internet: fica 'enviando' com o preparo guardado; a próxima tentativa só reassina", async () => {
    const armazem = await comPedacos();
    const ad = adaptador();
    const falha: SubirBlob = async () => {
      throw new Error("offline");
    };
    expect(
      (await enviarGravacao("g1", { armazem, adaptador: ad, subir: falha }))
        .fim,
    ).toBe("falhou");
    const g = await armazem.ler("g1");
    expect(g?.estado).toBe("enviando");
    expect(g?.preparado?.caminho).toBe("livros/l1/audios/g1.webm");
    const r = await enviarGravacao("g1", {
      armazem,
      adaptador: ad,
      subir: async () => {},
    });
    expect(r.fim).toBe("enviada");
    expect(ad.preparar).toHaveBeenCalledTimes(1);
    expect(ad.assinar).toHaveBeenCalledTimes(1);
  });

  it("linha vencida no servidor: id novo e reenvio do mesmo arquivo", async () => {
    const armazem = await comPedacos({
      preparado: { id: "g1", caminho: "x", contentType: "audio/webm" },
      estado: "enviando",
    });
    const ad = adaptador({
      assinar: vi.fn(async () => ({
        ok: false as const,
        mensagem: "venceu",
        codigo: "expirada" as const,
      })),
    });
    const impressoes: string[] = [];
    const r = await enviarGravacao("g1", {
      armazem,
      adaptador: ad,
      subir: async (_b, _p, _pr, i) => {
        impressoes.push(i);
      },
      novoId: () => "g2",
    });
    expect(r.fim).toBe("enviada");
    expect(impressoes).toEqual(["g2"]);
  });

  it("link trocado: a gravação fica parada no aparelho, sem se perder", async () => {
    const armazem = await comPedacos();
    const ad = adaptador({
      preparar: vi.fn(async () => ({
        ok: false as const,
        mensagem: "link",
        codigo: "link_invalido" as const,
      })),
    });
    const r = await enviarGravacao("g1", {
      armazem,
      adaptador: ad,
      subir: async () => {},
    });
    expect(r.fim).toBe("parada");
    expect((await armazem.ler("g1"))?.estado).toBe("parada");
    expect(await armazem.pedacos("g1")).toHaveLength(2);
  });

  it("já recebida no servidor: só apaga do aparelho", async () => {
    const armazem = await comPedacos();
    const subir = vi.fn();
    const ad = adaptador({
      preparar: vi.fn(async () => ({
        ok: true as const,
        dados: {
          id: "g1",
          caminho: "x",
          contentType: "audio/webm",
          token: null,
          recebida: true,
        },
      })),
    });
    expect(
      (await enviarGravacao("g1", { armazem, adaptador: ad, subir })).fim,
    ).toBe("enviada");
    expect(subir).not.toHaveBeenCalled();
  });

  it("confirmação recusada: continua no aparelho", async () => {
    const armazem = await comPedacos();
    const ad = adaptador({
      confirmar: vi.fn(async () => ({
        ok: false as const,
        mensagem: "incompleto",
      })),
    });
    expect(
      (
        await enviarGravacao("g1", {
          armazem,
          adaptador: ad,
          subir: async () => {},
        })
      ).fim,
    ).toBe("falhou");
    expect(await armazem.ler("g1")).not.toBeNull();
  });

  it("gravação sem nenhum pedaço é descartada", async () => {
    const armazem = armazemMemoria();
    await armazem.salvar(gravacao());
    expect(
      (
        await enviarGravacao("g1", {
          armazem,
          adaptador: adaptador(),
          subir: async () => {},
        })
      ).fim,
    ).toBe("vazia");
  });
});

describe("recuperar", () => {
  it("gravação interrompida no meio vira 'pronta' e as outras ficam como estão", async () => {
    const armazem = armazemMemoria();
    await armazem.salvar(
      gravacao({ id: "a", estado: "gravando", segundos: 0 }),
    );
    for (const seq of [0, 1, 2])
      await armazem.adicionarPedaco("a", seq, new Blob(["x"]));
    await armazem.salvar(
      gravacao({ id: "b", estado: "enviando", criadaEm: 2 }),
    );
    await armazem.salvar(
      gravacao({ id: "c", estado: "gravando", criadaEm: 3 }),
    );
    const r = await recuperar(armazem);
    expect(r.map((g) => [g.id, g.estado, g.segundos])).toEqual([
      ["a", "pronta", 3],
      ["b", "enviando", 12],
    ]);
    expect(await armazem.ler("c")).toBeNull();
  });
});
