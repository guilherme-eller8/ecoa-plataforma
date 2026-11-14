// Integração: a página de amostra com o Typst real, conferida como no servidor.
import { describe, expect, it } from "vitest";
import { gerarAmostra, qrDoCodigo } from "./amostra";
import { conferirQr } from "./conferir-qr";

const PARAGRAFO =
  "A gente saía de Belo Horizonte ainda de madrugada. Minha mãe acordava todo mundo às quatro, com o café já passado e o pão com manteiga embrulhado no guardanapo de pano.";

async function mupdf() {
  return import("mupdf");
}

describe("página de amostra (Typst)", () => {
  it("1 página de 216 × 216 mm, Newsreader embutida e o QR lido do PDF", async () => {
    const r = await gerarAmostra({
      titulo: "O trem para Guarapari",
      ano: 1962,
      paragrafos: [PARAGRAFO, PARAGRAFO],
      codigo: "7KQ2M9XA",
      foto: null,
    });
    expect(r.cortado).toBe(false);
    const c = await conferirQr(r.pdf, r.url);
    expect(c).toEqual({ ok: true, paginas: 1, lido: r.url });
    const m = await mupdf();
    const doc = m.Document.openDocument(r.pdf, "application/pdf");
    const [x0, y0, x1, y1] = doc.loadPage(0).getBounds();
    expect(Math.round(((x1 - x0) / 72) * 25.4)).toBe(216);
    expect(Math.round(((y1 - y0) / 72) * 25.4)).toBe(216);
    const bruto = r.pdf.toString("latin1");
    expect(bruto).toMatch(/Newsreader-Regular/);
    expect(bruto).toMatch(/FontFile2/);
  });

  it("história longa: corta em parágrafo inteiro e diz que continua", async () => {
    const r = await gerarAmostra({
      titulo: "Uma história comprida",
      ano: null,
      paragrafos: Array.from(
        { length: 30 },
        (_, i) => `${i + 1}. ${PARAGRAFO}`,
      ),
      codigo: "7KQ2M9XA",
      foto: null,
    });
    expect(r.cortado).toBe(true);
    expect((await conferirQr(r.pdf, r.url)).ok).toBe(true);
    const m = await mupdf();
    const texto = m.Document.openDocument(r.pdf, "application/pdf")
      .loadPage(0)
      .toStructuredText("preserve-whitespace")
      .asText();
    expect(texto).toContain("Continua no livro.");
  });

  it("texto da família com sintaxe do Typst sai como texto, nunca como código", async () => {
    const r = await gerarAmostra({
      titulo: '#set page(fill: red) *negrito* "aspas"',
      ano: 1950,
      paragrafos: ['#import "/etc/passwd" $x^2$ #panic("x") <rótulo> @ref'],
      codigo: "7KQ2M9XA",
      foto: null,
    });
    const m = await mupdf();
    const texto = m.Document.openDocument(r.pdf, "application/pdf")
      .loadPage(0)
      .toStructuredText("preserve-whitespace")
      .asText();
    expect(texto).toContain("#set page(fill: red)");
    expect(texto).toContain("#panic");
  });

  it("um PDF com o QR de outro código é recusado", async () => {
    const r = await gerarAmostra({
      titulo: "O trem",
      ano: null,
      paragrafos: [PARAGRAFO],
      codigo: "7KQ2M9XA",
      foto: null,
    });
    const c = await conferirQr(r.pdf, r.url.replace("7KQ2M9XA", "8KQ2M9XA"));
    expect(c.ok).toBe(false);
  });

  it("QR de 20 mm + margem: versão 3 em maiúsculas", async () => {
    const q = await qrDoCodigo("HTTPS://OUVIR.ECOA-MEMORIAS.COM.BR/7KQ2M9XA");
    expect(q.versao).toBe(3);
    expect(q.caixaMm).toBeCloseTo((20 * 37) / 29, 5);
  });
});
