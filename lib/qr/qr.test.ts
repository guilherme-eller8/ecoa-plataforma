import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { DOMINIO_QR } from "@/lib/config";
import {
  codigoImpresso,
  codigoValido,
  normalizarCodigo,
  urlDoQr,
} from "./codigo";
import { decidirQr } from "./host";
import { chaveDeRede, ipDaRequisicao, redeDoIp } from "./rede";

describe("código", () => {
  it("aceita só os 31 símbolos, 8 de cada vez", () => {
    expect(codigoValido("7KQ2M9XA")).toBe(true);
    for (const c of [
      "7KQ2M9X",
      "7KQ2M9XAA",
      "7KQ2M9X0",
      "7kq2m9xa",
      "IKQ2M9XA",
    ])
      expect(codigoValido(c)).toBe(false);
  });

  it("normaliza o digitado: maiúsculas, sem espaço nem hífen; nunca troca letra", () => {
    expect(normalizarCodigo(" 7kq2 m9xa ")).toEqual({
      ok: true,
      codigo: "7KQ2M9XA",
    });
    expect(normalizarCodigo("7KQ2-M9XA")).toEqual({
      ok: true,
      codigo: "7KQ2M9XA",
    });
    expect(normalizarCodigo("7KQ2 M9X0")).toEqual({
      ok: false,
      motivo: "letra_proibida",
    });
    expect(normalizarCodigo("OKQ2M9XA")).toEqual({
      ok: false,
      motivo: "letra_proibida",
    });
    expect(normalizarCodigo("7KQ2M9X")).toEqual({
      ok: false,
      motivo: "tamanho",
    });
    expect(normalizarCodigo("  ")).toEqual({ ok: false, motivo: "vazio" });
  });

  it("impresso em dois grupos de 4", () => {
    expect(codigoImpresso("7KQ2M9XA")).toBe("7KQ2 M9XA");
  });

  it("URL maiúscula cabe num QR menor que a minúscula (Q4)", () => {
    const mai = QRCode.create(urlDoQr("7KQ2M9XA", true), {
      errorCorrectionLevel: "Q",
    });
    const min = QRCode.create(urlDoQr("7KQ2M9XA", false), {
      errorCorrectionLevel: "Q",
    });
    expect(urlDoQr("7KQ2M9XA", false)).toBe(`https://${DOMINIO_QR}/7KQ2M9XA`);
    expect(mai.version).toBeLessThan(min.version);
  });
});

describe("chave de rede", () => {
  it("IP só dos cabeçalhos da Vercel", () => {
    expect(
      ipDaRequisicao(
        new Headers({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "1.2.3.4" }),
      ),
    ).toBe("1.2.3.4");
    expect(
      ipDaRequisicao(
        new Headers({ "x-vercel-forwarded-for": "5.5.5.5, 7.7.7.7" }),
      ),
    ).toBe("5.5.5.5");
    expect(
      ipDaRequisicao(new Headers({ "x-forwarded-for": "6.6.6.6" })),
    ).toBeNull();
  });

  it("IPv6 vira o /64; IPv4 mapeado volta a IPv4", () => {
    expect(redeDoIp("2804:14c:5b81:8b3a:1d2f:aa:1:2")).toBe(
      "2804:14c:5b81:8b3a::/64",
    );
    expect(redeDoIp("2804:14c::1")).toBe("2804:14c:0:0::/64");
    expect(redeDoIp("::ffff:10.0.0.1")).toBe("10.0.0.1");
    expect(redeDoIp("200.1.2.3")).toBe("200.1.2.3");
  });

  it("mesmo /64, mesma chave; muda com o dia e com o segredo; hex de 64", () => {
    const dia = new Date("2026-12-26T15:00:00Z");
    const a = chaveDeRede("2804:14c:5b81:8b3a::1", "s".repeat(64), dia);
    const b = chaveDeRede("2804:14c:5b81:8b3a::99", "s".repeat(64), dia);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(
      chaveDeRede(
        "2804:14c:5b81:8b3a::1",
        "s".repeat(64),
        new Date("2026-12-27T15:00:00Z"),
      ),
    ).not.toBe(a);
    expect(chaveDeRede("2804:14c:5b81:8b3a::1", "t".repeat(64), dia)).not.toBe(
      a,
    );
    expect(chaveDeRede(null, "s".repeat(64), dia)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("proxy do player", () => {
  it("no host ouvir: raiz, código em qualquer caixa e 404 para o resto", () => {
    expect(decidirQr(DOMINIO_QR, "/")).toEqual({
      tipo: "reescrever",
      destino: "/ouvir",
    });
    expect(decidirQr(DOMINIO_QR, "/7kq2m9xa")).toEqual({
      tipo: "reescrever",
      destino: "/ouvir/7KQ2M9XA",
    });
    for (const c of [
      "/admin123",
      "/livro/1",
      "/f/v1_x",
      "/a/v1_x",
      "/ouvir/7KQ2M9XA",
      "/7KQ2M9X0",
    ])
      expect(decidirQr(DOMINIO_QR, c)).toEqual({ tipo: "nao_encontrado" });
  });

  it("no host app: o player vai para o host ouvir; o resto segue", () => {
    expect(decidirQr("app.ecoa-memorias.com.br", "/ouvir/7KQ2M9XA")).toEqual({
      tipo: "redirecionar",
      url: `https://${DOMINIO_QR}/7KQ2M9XA`,
    });
    expect(decidirQr("app.ecoa-memorias.com.br", "/ouvir")).toEqual({
      tipo: "redirecionar",
      url: `https://${DOMINIO_QR}/`,
    });
    expect(decidirQr("app.ecoa-memorias.com.br", "/livro/1")).toBeNull();
  });

  it("em prévia e localhost: serve o player sem sessão", () => {
    expect(
      decidirQr("ecoa-plataforma-git-x.vercel.app", "/ouvir/7KQ2M9XA"),
    ).toEqual({ tipo: "servir" });
    expect(decidirQr("localhost:3000", "/ouvir")).toEqual({ tipo: "servir" });
    expect(decidirQr("localhost:3000", "/entrar")).toBeNull();
  });
});
