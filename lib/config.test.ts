import { describe, expect, it } from "vitest";
import {
  DOMINIO_APP,
  DOMINIO_QR,
  EMAIL_REMETENTE,
  FORMATO_LIVRO,
  MAX_ARQUIVOS_LOTE,
  MAX_COFACILITADORES,
  PAGINAS_INCLUSAS,
  PRECO_PLANO,
  VALOR_COPIA_EXTRA,
  VALOR_PAGINA_EXTRA,
} from "./config";

describe("lib/config", () => {
  it("mantém os números de negócio do PRD", () => {
    expect(PRECO_PLANO).toBe(467);
    expect(PAGINAS_INCLUSAS).toBe(80);
    expect(MAX_COFACILITADORES).toBe(3);
    expect(MAX_ARQUIVOS_LOTE).toBe(30);
    expect(FORMATO_LIVRO).toBe("21x21");
  });

  it("deixa os valores extras sem definir até a cotação da gráfica", () => {
    expect(VALOR_PAGINA_EXTRA).toBeNull();
    expect(VALOR_COPIA_EXTRA).toBeNull();
  });

  it("usa domínios sem protocolo e separados para app e QR", () => {
    for (const dominio of [DOMINIO_APP, DOMINIO_QR]) {
      expect(dominio).toMatch(/^[a-z0-9.-]+\.com\.br$/);
    }
    expect(DOMINIO_APP).not.toBe(DOMINIO_QR);
  });

  it("usa o domínio com hífen, verificado no Resend, para app, QR e e-mail", () => {
    expect(DOMINIO_APP).toBe("app.ecoa-memorias.com.br");
    expect(DOMINIO_QR).toBe("ouvir.ecoa-memorias.com.br");
    expect(EMAIL_REMETENTE).toMatch(/<[^@]+@ecoa-memorias\.com\.br>$/);
  });
});
