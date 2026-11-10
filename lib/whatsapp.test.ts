import { describe, expect, it } from "vitest";
import {
  conviteDoGrupo,
  linkWhatsApp,
  mensagemAoAutor,
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
