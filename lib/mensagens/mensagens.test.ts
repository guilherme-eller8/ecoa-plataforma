// Prompt 12: limpeza da transcrição, tipo pelos primeiros bytes, transcrição com Scribe falso,
// caminhos das mensagens e o convite do WhatsApp.
import { describe, expect, it } from "vitest";
import { arquivoDaMensagem } from "@/lib/arquivos";
import { conviteMensagem } from "@/lib/whatsapp";
import { tipoPelosBytes } from "./bytes";
import { juntarPalavras, limparTranscricao } from "./limpar";
import { transcreverAudio } from "./transcrever";

describe("transcrição: bruto e sugestão", () => {
  it("junta as palavras como vieram, colando a pontuação", () => {
    expect(
      juntarPalavras([
        { texto: "Tio" },
        { texto: "," },
        { texto: "ahn" },
        { texto: "obrigado." },
      ]),
    ).toBe("Tio, ahn obrigado.");
  });

  it("tira só hesitações isoladas, com a pontuação presa a elas", () => {
    expect(limparTranscricao("ahn, tio, hum… éé obrigado por tudo")).toBe(
      "Tio, obrigado por tudo",
    );
  });

  it("não troca nem junta palavras: 'é' verbo, repetição, né e aí ficam", () => {
    const fala = "não, não é bem assim, tchau tchau, né, aí ele foi";
    expect(limparTranscricao(fala)).toBe(
      "Não, não é bem assim, tchau tchau, né, aí ele foi",
    );
  });

  it("acerta a maiúscula do começo depois de tirar a hesitação", () => {
    expect(limparTranscricao("hmm vó, saudade")).toBe("Vó, saudade");
  });
});

describe("tipo pelos primeiros bytes", () => {
  const b = (...n: number[]) => new Uint8Array(n);
  it.each([
    [b(0x1a, 0x45, 0xdf, 0xa3, 1), "webm"],
    [b(0x4f, 0x67, 0x67, 0x53, 0), "ogg"],
    [b(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70), "m4a"],
    [b(0xff, 0xd8, 0xff, 0xe0), "jpg"],
    [b(0x89, 0x50, 0x4e, 0x47), null],
    [b(0x3c, 0x73, 0x76, 0x67), null],
    [b(), null],
  ])("%o → %s", (bytes, tipo) => {
    expect(tipoPelosBytes(bytes)).toBe(tipo);
  });
});

describe("transcreverAudio", () => {
  const palavras = [
    { texto: "Oi", inicio: 0.1, fim: 0.4, falante: null, confianca: null },
    { texto: "tio.", inicio: 0.5, fim: 312.2, falante: null, confianca: null },
  ];

  it("pede sem diarização, com o apelido de dica e corte; devolve bruto e fim", async () => {
    let opcoes: Record<string, unknown> = {};
    const r = await transcreverAudio(
      new Uint8Array([1]),
      "a.webm",
      "Tio Nelson",
      {
        chave: "k",
        modelo: "scribe_v1",
        transcrever: async (_a, _n, o) => {
          opcoes = o;
          return {
            provedor: "elevenlabs",
            modelo: "scribe_v1",
            palavras,
            bruto: {},
          };
        },
      },
    );
    expect(r).toEqual({ ok: true, bruto: "Oi tio.", fimS: 312.2 });
    expect(opcoes).toMatchObject({ diarizar: false, dicas: ["Tio Nelson"] });
    expect(opcoes.signal).toBeInstanceOf(AbortSignal);
  });

  it("falha do provedor ou corte vira { ok: false }, sem texto", async () => {
    const r = await transcreverAudio(new Uint8Array([1]), "a.webm", null, {
      chave: "k",
      modelo: "m",
      timeoutMs: 10,
      transcrever: (_a, _n, o) =>
        new Promise((_ok, falha) =>
          o.signal?.addEventListener("abort", () =>
            falha(new Error("cortado")),
          ),
        ),
    });
    expect(r).toEqual({ ok: false });
  });
});

describe("caminhos das mensagens", () => {
  const livro = "11111111-1111-4111-8111-111111111111";
  const msg = "22222222-2222-4222-8222-222222222222";
  it("aceita só o áudio e a foto da própria mensagem", () => {
    expect(
      arquivoDaMensagem(
        `livros/${livro}/mensagens/${msg}.webm`,
        livro,
        msg,
        "audio",
      ),
    ).toBe(true);
    expect(
      arquivoDaMensagem(
        `livros/${livro}/mensagens/${msg}-foto.jpg`,
        livro,
        msg,
        "foto",
      ),
    ).toBe(true);
    expect(
      arquivoDaMensagem(
        `livros/${livro}/mensagens/${msg}-foto.jpg`,
        livro,
        msg,
        "audio",
      ),
    ).toBe(false);
    expect(
      arquivoDaMensagem(
        `livros/${livro}/causos/${msg}.webm`,
        livro,
        msg,
        "audio",
      ),
    ).toBe(false);
    expect(
      arquivoDaMensagem(
        `livros/${livro}/mensagens/../${msg}.webm`,
        livro,
        msg,
        "audio",
      ),
    ).toBe(false);
    expect(
      arquivoDaMensagem(
        `livros/${livro}/mensagens/${msg}.webm`,
        "x",
        msg,
        "audio",
      ),
    ).toBe(false);
  });
});

describe("convite do WhatsApp", () => {
  it("diz que é surpresa, com o pronome pelo parentesco, e leva o link", () => {
    const m = conviteMensagem({
      autor: "Tio Nelson",
      parentesco: "tio",
      link: "https://x/m/1",
    });
    expect(m).toContain("histórias de Tio Nelson");
    expect(m).toContain("não conte para ele");
    expect(m).toContain("https://x/m/1");
    expect(
      conviteMensagem({ autor: "Vó Lia", parentesco: "avoa", link: "l" }),
    ).toContain("não conte para ela");
    expect(
      conviteMensagem({ autor: "Zé", parentesco: null, link: "l" }),
    ).toContain("não conte para Zé");
  });
});
