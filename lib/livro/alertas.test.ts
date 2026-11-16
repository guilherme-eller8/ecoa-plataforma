import { describe, expect, it } from "vitest";
import { conteudoDeExemplo } from "@/lib/exemplos/prompt13";
import { alertasDoLivro, bloqueia } from "./alertas";

const codigos = (a: ReturnType<typeof alertasDoLivro>) =>
  a.map((x) => x.codigo);

describe("alertas do Conferir", () => {
  it("livro completo: só a mensagem sem voz avisa (amarelo), nada bloqueia", () => {
    const a = alertasDoLivro(conteudoDeExemplo());
    expect(bloqueia(a)).toBe(false);
    expect(codigos(a)).toEqual(["mensagem_sem_qr"]);
  });

  it("vermelho primeiro: sem título, história não pronta, título longo", () => {
    const c = conteudoDeExemplo({ titulo: null });
    c.historias[0].revisada = false;
    let a = alertasDoLivro(c);
    expect(bloqueia(a)).toBe(true);
    expect(codigos(a).slice(0, 2)).toEqual([
      "livro_sem_titulo",
      "historia_nao_pronta",
    ]);
    a = alertasDoLivro(conteudoDeExemplo(), { tituloCapaLinhas: 4 });
    expect(codigos(a)).toContain("titulo_capa_longo");
    expect(a[0].nivel).toBe("vermelho");
  });

  it("história riscada não gera alerta nem bloqueia (Q9)", () => {
    const c = conteudoDeExemplo();
    c.historias[0].revisada = false;
    c.historias[0].incluida = false;
    expect(bloqueia(alertasDoLivro(c))).toBe(false);
  });

  it("amarelos: história curta, foto pequena e sem QR (Q10)", () => {
    const c = conteudoDeExemplo();
    c.historias[1].palavras = 50;
    c.historias[2].fotos = [{ caminho: "x", largura: 800, altura: 600 }];
    c.historias[3].qr = null;
    c.historias[4].qr = { codigo: "7KQ2M9XE", ligado: false }; // desligado pelo responsável
    const a = alertasDoLivro(c);
    expect(codigos(a)).toEqual(
      expect.arrayContaining([
        "historia_curta",
        "foto_pequena",
        "historia_sem_qr",
      ]),
    );
    expect(a.filter((x) => x.codigo === "historia_sem_qr")).toHaveLength(2);
    expect(bloqueia(a)).toBe(false);
  });

  it("antes de publicar o QR não existe: com voz não avisa, sem voz avisa", () => {
    const c = conteudoDeExemplo();
    c.historias[0].qr = null;
    c.historias[0].voz = true; // tem voz: o QR nasce ao publicar
    c.historias[1].qr = null;
    c.historias[1].voz = false; // só escrita
    c.mensagens[0].qr = null; // mensagem com áudio, QR ainda não criado
    const a = alertasDoLivro(c);
    expect(
      a.filter((x) => x.codigo === "historia_sem_qr").map((x) => x.item),
    ).toEqual([c.historias[1].id]);
    expect(
      a.filter((x) => x.codigo === "mensagem_sem_qr").map((x) => x.item),
    ).toEqual([c.mensagens[1].id]);
  });

  it("livro vazio bloqueia", () => {
    const c = conteudoDeExemplo();
    c.historias = [];
    c.mensagens = [];
    expect(codigos(alertasDoLivro(c))).toContain("livro_vazio");
  });
});
