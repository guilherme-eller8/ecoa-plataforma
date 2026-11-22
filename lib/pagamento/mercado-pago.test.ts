import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assinaturaConfere,
  corpoDaPreferencia,
  lerAssinatura,
} from "./mercado-pago";

const segredo = "segredo-de-teste-123";
function assinar(dataId: string, requestId: string, ts: string) {
  return createHmac("sha256", segredo)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest("hex");
}

describe("assinaturaConfere", () => {
  const ts = "1742505638683";
  const v1 = assinar("123456", "req-1", ts);
  const ok = {
    assinatura: `ts=${ts},v1=${v1}`,
    requestId: "req-1",
    dataId: "123456",
    segredo,
  };

  it("válida", () => {
    expect(assinaturaConfere(ok)).toBe(true);
    expect(
      assinaturaConfere({ ...ok, assinatura: ` ts=${ts} , v1=${v1}` }),
    ).toBe(true);
  });
  it("v1 trocado, ts trocado, id trocado ou outro segredo: falso", () => {
    expect(
      assinaturaConfere({
        ...ok,
        assinatura: `ts=${ts},v1=${assinar("1", "req-1", ts)}`,
      }),
    ).toBe(false);
    expect(assinaturaConfere({ ...ok, assinatura: `ts=999,v1=${v1}` })).toBe(
      false,
    );
    expect(assinaturaConfere({ ...ok, dataId: "123457" })).toBe(false);
    expect(assinaturaConfere({ ...ok, requestId: "req-2" })).toBe(false);
    expect(assinaturaConfere({ ...ok, segredo: "outro-segredo-123" })).toBe(
      false,
    );
  });
  it("cabeçalho faltando, malformado ou de outro tamanho: falso sem lançar", () => {
    expect(assinaturaConfere({ ...ok, assinatura: null })).toBe(false);
    expect(assinaturaConfere({ ...ok, requestId: null })).toBe(false);
    expect(assinaturaConfere({ ...ok, assinatura: "lixo" })).toBe(false);
    expect(assinaturaConfere({ ...ok, assinatura: `ts=${ts},v1=abc` })).toBe(
      false,
    );
    expect(
      assinaturaConfere({ ...ok, assinatura: `ts=${ts},v1=${v1}00` }),
    ).toBe(false);
    expect(
      assinaturaConfere({ ...ok, assinatura: `ts=${ts},v1=${"z".repeat(64)}` }),
    ).toBe(false);
  });
  it("lerAssinatura", () => {
    expect(lerAssinatura("ts=1,v1=ab")).toEqual({ ts: "1", v1: "ab" });
    expect(lerAssinatura("v1=ab")).toBeNull();
    expect(lerAssinatura("")).toBeNull();
  });
});

describe("corpoDaPreferencia", () => {
  const agora = new Date("2026-11-22T12:00:00Z");
  const corpo = corpoDaPreferencia({
    compra: "c0ffee00-0000-4000-8000-000000000001",
    email: "ana@gmail.com",
    valorCentavos: 46700,
    urlApp: "https://app.ecoa-memorias.com.br",
    validadeH: 48,
    agora,
  });
  it("Pix e cartão até 12x, sem boleto", () => {
    expect(corpo.payment_methods).toEqual({
      installments: 12,
      excluded_payment_types: [{ id: "ticket" }],
    });
  });
  it("referência, valor, volta, aviso, validade e fatura", () => {
    expect(corpo.external_reference).toBe(
      "c0ffee00-0000-4000-8000-000000000001",
    );
    expect(corpo.items[0]).toMatchObject({
      quantity: 1,
      unit_price: 467,
      currency_id: "BRL",
    });
    expect(corpo.back_urls.success).toBe(
      "https://app.ecoa-memorias.com.br/comprar/pronto/c0ffee00-0000-4000-8000-000000000001",
    );
    expect(corpo.back_urls.failure).toBe(corpo.back_urls.success);
    expect(corpo.auto_return).toBe("approved");
    expect(corpo.notification_url).toBe(
      "https://app.ecoa-memorias.com.br/api/mercadopago",
    );
    expect(corpo.expires).toBe(true);
    expect(corpo.expiration_date_to).toBe("2026-11-24T12:00:00.000Z");
    expect(corpo.statement_descriptor).toBe("ECOAMEMORIAS");
    expect(corpo.payer).toEqual({ email: "ana@gmail.com" });
  });
});
