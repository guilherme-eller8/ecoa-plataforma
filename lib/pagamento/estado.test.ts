import { describe, expect, it } from "vitest";
import {
  acaoDoStatus,
  deveConsultarNaVolta,
  emailDaCompra,
  emCentavos,
  estadoDaTela,
  sugerirDominio,
  valorConfere,
} from "./estado";

describe("acaoDoStatus", () => {
  it.each([
    ["approved", { acao: "aprovar" }],
    ["pending", { acao: "pendente" }],
    ["in_process", { acao: "pendente" }],
    ["authorized", { acao: "pendente" }],
    ["rejected", { acao: "recusado" }],
    ["cancelled", { acao: "recusado" }],
    ["refunded", { acao: "estorno" }],
    ["charged_back", { acao: "estorno" }],
    ["in_mediation", { acao: "reter", alerta: "mediacao" }],
    ["partially_refunded", { acao: "reter", alerta: "estorno_parcial" }],
    ["qualquer_outro", { acao: "nada" }],
    ["", { acao: "nada" }],
  ])("%s", (status, esperado) => {
    expect(acaoDoStatus(status)).toEqual(esperado);
  });
});

describe("centavos e valor", () => {
  it("arredonda o ponto flutuante", () => {
    expect(emCentavos(155.1)).toBe(15510);
    expect(emCentavos(0.29)).toBe(29);
    expect(emCentavos(467)).toBe(46700);
    expect(emCentavos(4.35)).toBe(435);
  });
  it("confere moeda e valor", () => {
    expect(
      valorConfere({ currency_id: "BRL", transaction_amount: 467 }, 46700),
    ).toBe(true);
    expect(
      valorConfere({ currency_id: "USD", transaction_amount: 467 }, 46700),
    ).toBe(false);
    expect(
      valorConfere({ currency_id: "BRL", transaction_amount: 466.99 }, 46700),
    ).toBe(false);
  });
});

describe("estadoDaTela", () => {
  it("leva os 6 estados do banco aos 4 da volta", () => {
    expect(estadoDaTela("criado")).toBe("esperando");
    expect(estadoDaTela("pendente")).toBe("esperando");
    expect(estadoDaTela("aprovado")).toBe("pronto");
    expect(estadoDaTela("recusado")).toBe("nao_passou");
    expect(estadoDaTela("retido")).toBe("conferindo");
    expect(estadoDaTela("estornado")).toBe("conferindo");
  });
});

describe("deveConsultarNaVolta", () => {
  const agora = Date.parse("2026-11-22T12:00:00Z");
  const antiga = "2026-11-22T11:59:50Z";
  it("consulta com payment_id novo, estado aberto e mudança antiga", () => {
    expect(
      deveConsultarNaVolta(
        { estado: "criado", mp_pagamento_id: null, atualizado_em: antiga },
        "123",
        3,
        agora,
      ),
    ).toBe(true);
  });
  it("não consulta sem payment_id, com payment_id estranho ou já gravado", () => {
    const c = {
      estado: "pendente" as const,
      mp_pagamento_id: "123",
      atualizado_em: antiga,
    };
    expect(deveConsultarNaVolta(c, null, 3, agora)).toBe(false);
    expect(deveConsultarNaVolta(c, "abc", 3, agora)).toBe(false);
    expect(deveConsultarNaVolta(c, "123", 3, agora)).toBe(false);
  });
  it("não consulta em estado final nem logo depois de uma mudança", () => {
    expect(
      deveConsultarNaVolta(
        { estado: "aprovado", mp_pagamento_id: null, atualizado_em: antiga },
        "9",
        3,
        agora,
      ),
    ).toBe(false);
    expect(
      deveConsultarNaVolta(
        {
          estado: "criado",
          mp_pagamento_id: null,
          atualizado_em: "2026-11-22T11:59:58Z",
        },
        "9",
        3,
        agora,
      ),
    ).toBe(false);
  });
});

describe("sugerirDominio e emailDaCompra", () => {
  it("corrige os erros comuns", () => {
    expect(sugerirDominio("fulano@gmial.com")).toBe("fulano@gmail.com");
    expect(sugerirDominio(" Fulano@Hotmial.com ")).toBe("fulano@hotmail.com");
    expect(sugerirDominio("ana@outlok.com")).toBe("ana@outlook.com");
    expect(sugerirDominio("ana@yahoo.com.b")).toBe("ana@yahoo.com.br");
  });
  it("não sugere quando está certo ou não é e-mail", () => {
    expect(sugerirDominio("fulano@gmail.com")).toBeNull();
    expect(sugerirDominio("fulano@empresa.com.br")).toBeNull();
    expect(sugerirDominio("semarroba")).toBeNull();
  });
  it("aceita só e-mail com cara de e-mail, minúsculo", () => {
    expect(emailDaCompra("  Ana@Gmail.com ")).toBe("ana@gmail.com");
    expect(emailDaCompra("ana @gmail.com")).toBeNull();
    expect(emailDaCompra("ana@gmail")).toBeNull();
    expect(emailDaCompra("a@b@c.com")).toBeNull();
  });
});
