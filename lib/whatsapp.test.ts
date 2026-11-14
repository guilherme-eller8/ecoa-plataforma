import { describe, expect, it } from "vitest";
import {
  conviteDoGrupo,
  linkWhatsApp,
  mensagemAoAutor,
  mensagemCompartilhar,
  mensagemConvite,
  mensagemLembrete,
  mensagemPergunta,
  partesComLinks,
} from "./whatsapp";

describe("mensagens do WhatsApp", () => {
  it("o link abre o wa.me com o texto codificado", () => {
    const l = linkWhatsApp("Olá, Jair & família\nlinha 2");
    expect(l.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(l.split("text=")[1])).toBe(
      "Olá, Jair & família\nlinha 2",
    );
  });

  it("o convite do grupo leva o link da família e o nome do autor", () => {
    const t = conviteDoGrupo({ autor: "Jair", link: "https://x/f/v1_abc" });
    expect(t).toContain("Jair");
    expect(t).toContain("https://x/f/v1_abc");
  });

  it("a mensagem ao autor e a da pergunta levam o link pessoal", () => {
    expect(mensagemAoAutor({ autor: "Pai", link: "https://x/a/1" })).toContain(
      "https://x/a/1",
    );
    const m = mensagemPergunta({
      autor: "Pai",
      pergunta: "Como era a casa?",
      link: "https://x/a/1",
    });
    expect(m).toContain('"Como era a casa?"');
    expect(m).toContain("https://x/a/1");
  });

  it("com celular, abre a conversa direto", () => {
    expect(linkWhatsApp("oi", "+5531999998888")).toBe(
      "https://wa.me/5531999998888?text=oi",
    );
    expect(linkWhatsApp("oi", null)).toBe("https://wa.me/?text=oi");
  });

  it("separa os links do texto", () => {
    expect(partesComLinks("Veja:\nhttps://x.com/f/v1_a e pronto")).toEqual([
      { texto: "Veja:\n", link: false },
      { texto: "https://x.com/f/v1_a", link: true },
      { texto: " e pronto", link: false },
    ]);
  });
});

describe("mensagemPrimeiraHistoria", () => {
  it("traz o autor e o link da família", async () => {
    const { mensagemPrimeiraHistoria } = await import("./whatsapp");
    const m = mensagemPrimeiraHistoria({
      autor: "Vô Jair",
      link: "https://x/f/abc",
    });
    expect(m).toContain("Vô Jair");
    expect(m).toContain("https://x/f/abc");
  });
});

describe("mensagens do prompt 11", () => {
  const base = { autor: "Jair", titulo: "A fazenda", link: "https://x/o/1" };
  it("compartilhar: dele, dela, original e sem voz", () => {
    expect(
      mensagemCompartilhar({ ...base, parentesco: "avo", comVoz: true }),
    ).toBe(
      'Jair contou: "A fazenda". Ouça na voz dele e leia aqui: https://x/o/1',
    );
    expect(
      mensagemCompartilhar({ ...base, parentesco: "mae", comVoz: true }),
    ).toContain("na voz dela");
    expect(
      mensagemCompartilhar({ ...base, parentesco: null, comVoz: true }),
    ).toContain("na voz original");
    const semVoz = mensagemCompartilhar({
      ...base,
      parentesco: "avo",
      comVoz: false,
    });
    expect(semVoz).toBe('Jair contou: "A fazenda". Leia aqui: https://x/o/1');
    expect(semVoz).not.toMatch(/voz|Ouça/);
  });

  it("lembrete gentil com a pergunta e o link", () => {
    const m = mensagemLembrete({
      autor: "Jair",
      pergunta: "Como era a escola?",
      link: "https://x/a/t/gravar/9",
    });
    expect(m).toBe(
      'Oi, Jair! Lembrei daquela pergunta: "Como era a escola?". Quando tiver um tempinho, grava pra gente? É só tocar aqui: https://x/a/t/gravar/9',
    );
  });

  it("convite fala do e-mail e leva o link", () => {
    const m = mensagemConvite({ autor: "Jair", link: "https://x/convite/1" });
    expect(m).toContain("e-mail");
    expect(m).toContain("https://x/convite/1");
  });
});
