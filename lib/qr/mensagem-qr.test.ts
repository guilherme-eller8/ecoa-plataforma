// QR de mensagem (T51): recorte do arquivo inteiro no bucket `mensagens` e player com nome e relação.
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  clienteAdmin: () => ({
    rpc,
    from: () => ({
      select: () => ({ in: async () => ({ data: [], error: null }) }),
    }),
  }),
}));
vi.mock("@/lib/storage/assinar", () => ({
  assinarLeitura: async (_b: string, caminhos: string[]) =>
    new Map(caminhos.map((c) => [c, `https://assinada.exemplo/${c}`])),
}));
vi.mock("@/lib/env-qr", () => ({ segredoDaRede: () => "segredo-de-teste" }));
vi.mock("@/lib/inngest/cliente", () => ({
  inngest: { send: vi.fn(async () => undefined) },
}));

import { abrirQr } from "./player";
import { planejarRecorte } from "./recortar";
import { OuvirQr, TrechosQr } from "./tipos";

const LIVRO = "11111111-1111-4111-8111-111111111111";
const MSG = "22222222-2222-4222-8222-222222222222";
const caminhoMsg = `livros/${LIVRO}/mensagens/${MSG}.m4a`;

beforeEach(() => rpc.mockReset());

describe("recorte de QR de mensagem", () => {
  it("lê o bucket da mensagem, sem gravação nem segmentos, e corta o arquivo inteiro", async () => {
    rpc.mockResolvedValue({
      error: null,
      data: {
        book_id: LIVRO,
        bucket: "mensagens",
        fonte: "a".repeat(64),
        desativado: false,
        gravacoes: [
          {
            recording_id: null,
            caminho: caminhoMsg,
            content_type: "audio/mp4",
            duracao_s: 62.4,
            segmentos: null,
          },
        ],
      },
    });
    const plano = await planejarRecorte("8MNP3QRS");
    expect(plano).toMatchObject({ livro: LIVRO, bucket: "mensagens" });
    expect(plano!.gravacoes).toEqual([
      {
        caminho: caminhoMsg,
        demuxer: "mov",
        trechos: [{ inicio: 0, fim: 62.4 }],
      },
    ]);
  });

  it("mensagem arquivada (QR desativado) não tem nada a cortar", async () => {
    rpc.mockResolvedValue({
      error: null,
      data: {
        book_id: LIVRO,
        bucket: "mensagens",
        fonte: "b".repeat(64),
        desativado: true,
        gravacoes: [],
      },
    });
    expect(await planejarRecorte("8MNP3QRS")).toBeNull();
  });

  it("o contrato aceita história (bucket audios) e mensagem (recording_id nulo)", () => {
    expect(
      TrechosQr.safeParse({
        book_id: LIVRO,
        bucket: "audios",
        fonte: "c".repeat(64),
        desativado: false,
        gravacoes: [
          {
            recording_id: MSG,
            caminho: "x",
            content_type: null,
            duracao_s: null,
            segmentos: [1],
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      TrechosQr.safeParse({
        book_id: LIVRO,
        bucket: "outro",
        fonte: "c".repeat(64),
        desativado: false,
        gravacoes: [],
      }).success,
    ).toBe(false);
  });
});

describe("player de QR de mensagem", () => {
  it("mostra 'Mensagem de Bia, neta' e nunca o texto", async () => {
    rpc.mockResolvedValue({
      error: null,
      data: {
        estado: "ok",
        tipo: "mensagem",
        nome: "Bia",
        relacao: "neta",
        audio_caminho: `livros/${LIVRO}/QR-8MNP3QRS-abc.m4a`,
        texto: "ESTE TEXTO NUNCA PODE APARECER",
      },
    });
    const r = await abrirQr(
      "8MNP3QRS",
      new Headers({ "x-forwarded-for": "203.0.113.9" }),
    );
    expect(r).toMatchObject({
      estado: "ok",
      titulo: "Mensagem de Bia, neta",
      ano: null,
    });
    expect(JSON.stringify(r)).not.toContain("NUNCA PODE");
  });

  it("mensagem arquivada: 'Este áudio não está mais disponível' (desativado)", async () => {
    rpc.mockResolvedValue({ error: null, data: { estado: "desativado" } });
    expect(await abrirQr("8MNP3QRS", new Headers())).toEqual({
      estado: "desativado",
    });
  });

  it("história continua igual", async () => {
    rpc.mockResolvedValue({
      error: null,
      data: {
        estado: "ok",
        tipo: "historia",
        titulo: "O trem",
        ano: 1962,
        audio_caminho: "livros/x/y.m4a",
      },
    });
    expect(await abrirQr("7KQ2M9XA", new Headers())).toMatchObject({
      estado: "ok",
      titulo: "O trem",
      ano: 1962,
    });
    expect(
      OuvirQr.safeParse({
        estado: "ok",
        titulo: "sem tipo",
        ano: null,
        audio_caminho: "x",
      }).success,
    ).toBe(false);
  });
});
