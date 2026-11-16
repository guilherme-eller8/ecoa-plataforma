import { describe, expect, it } from "vitest";
import { conteudoDeExemplo } from "@/lib/exemplos/prompt13";
import { codigoValido } from "@/lib/qr/codigo";
import { dadosDoFolheio, QR_PROVISORIO } from "./folhear-dados";
import { montarDadosMiolo } from "./montar-dados";

const data = new Date("2026-11-16T15:00:00Z");

describe("Folhear antes de publicar (P72)", () => {
  it("QR de verdade onde já existe; provisório só onde vai sair com QR ao publicar", () => {
    const c = conteudoDeExemplo();
    c.historias[0].qr = { codigo: "7KQ2M9XA", ligado: true };
    c.historias[1].qr = null;
    c.historias[1].voz = true; // vai ganhar QR ao publicar
    c.historias[2].qr = null;
    c.historias[2].voz = false; // sem voz que o QR toque: sai sem QR
    c.historias[3].qr = { codigo: "7KQ2M9XC", ligado: false }; // desligado: sai sem QR
    const f = dadosDoFolheio(c, data);
    const porTitulo = new Map(
      f.dados.historias.map((h) => [h.titulo, h.qr?.codigo ?? null]),
    );
    expect(porTitulo.get(c.historias[0].titulo!)).toBe("7KQ2M9XA");
    expect(porTitulo.get(c.historias[1].titulo!)).toBe(QR_PROVISORIO);
    expect(porTitulo.get(c.historias[2].titulo!)).toBeNull();
    expect(porTitulo.get(c.historias[3].titulo!)).toBeNull();
    expect(f.provisorios).toBeGreaterThanOrEqual(1);
  });

  it("o resto do JSON é o mesmo do PDF final (T20), menos o colofão sem número de versão", () => {
    const c = conteudoDeExemplo();
    for (const h of c.historias) h.voz = false;
    for (const m of c.mensagens) m.com_audio = false;
    const f = dadosDoFolheio(c, data);
    const final = montarDadosMiolo(c, { modo: "final", versao: null, data });
    expect({ ...f.dados, colofao: null }).toEqual({
      ...final.dados,
      colofao: null,
    });
    expect(f.fotos).toEqual(final.fotos);
    expect(f.dados.colofao.linha).toMatch(/prévia$/);
    expect(f.provisorios).toBe(0);
  });

  it("o código provisório tem o formato de um código, para o QR ter o tamanho certo", () => {
    expect(codigoValido(QR_PROVISORIO)).toBe(true);
  });
});
