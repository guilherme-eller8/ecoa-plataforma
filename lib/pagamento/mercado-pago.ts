import "server-only";
// As 3 chamadas ao Mercado Pago (preferência, pagamento e busca) e a assinatura do aviso.
// fetch + zod, sem SDK (Alternativa D). Nenhum dado de cartão passa por aqui (P77).
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const API = "https://api.mercadopago.com";
const ESPERA_MS = 10_000;

/** Falha que uma nova tentativa pode resolver (rede, 5xx, 429). O aviso responde 500. */
export class ErroPassageiro extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = "ErroPassageiro";
  }
}

// ── Preferência (Checkout Pro) ───────────────────────────────────────────
export type DadosDaPreferencia = {
  compra: string;
  email: string;
  valorCentavos: number;
  urlApp: string;
  validadeH: number;
  agora?: Date;
};

/** Corpo do POST /checkout/preferences. Puro e testado: Pix e cartão até 12x, sem boleto. */
export function corpoDaPreferencia(d: DadosDaPreferencia) {
  const agora = d.agora ?? new Date();
  const volta = `${d.urlApp}/comprar/pronto/${d.compra}`;
  return {
    items: [
      {
        id: "plano-anual",
        title: "Plano anual Ecoa Memórias",
        quantity: 1,
        currency_id: "BRL",
        unit_price: d.valorCentavos / 100,
      },
    ],
    // Só preenche o formulário do Mercado Pago; o responsável é o e-mail digitado na Ecoa.
    payer: { email: d.email },
    external_reference: d.compra,
    back_urls: { success: volta, pending: volta, failure: volta },
    auto_return: "approved",
    notification_url: `${d.urlApp}/api/mercadopago`,
    payment_methods: {
      installments: 12,
      excluded_payment_types: [{ id: "ticket" }],
    },
    expires: true,
    expiration_date_from: agora.toISOString(),
    expiration_date_to: new Date(
      agora.getTime() + d.validadeH * 3600_000,
    ).toISOString(),
    statement_descriptor: "ECOAMEMORIAS",
  };
}

const respostaPreferencia = z.object({
  id: z.string().min(1),
  init_point: z.url(),
  sandbox_init_point: z.url().optional(),
});

async function chamar(
  token: string,
  caminho: string,
  init: RequestInit = {},
): Promise<Response> {
  let r: Response;
  try {
    r = await fetch(`${API}${caminho}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(ESPERA_MS),
      cache: "no-store",
    });
  } catch {
    throw new ErroPassageiro("rede");
  }
  if (r.status === 429 || r.status >= 500)
    throw new ErroPassageiro(`http_${r.status}`);
  return r;
}

/**
 * Cria a cobrança e devolve o endereço do pagamento. Credencial de teste antiga (`TEST-`)
 * só paga no ambiente sandbox; a de usuário de teste e a de produção usam `init_point`.
 */
export async function criarPreferencia(
  token: string,
  dados: DadosDaPreferencia,
): Promise<{ id: string; link: string }> {
  const r = await chamar(token, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(corpoDaPreferencia(dados)),
    headers: { "X-Idempotency-Key": `preferencia:${dados.compra}` },
  });
  if (!r.ok) throw new ErroPassageiro(`preferencia_${r.status}`);
  const p = respostaPreferencia.parse(await r.json());
  const link =
    token.startsWith("TEST-") && p.sandbox_init_point
      ? p.sandbox_init_point
      : p.init_point;
  return { id: p.id, link };
}

// ── Pagamento ────────────────────────────────────────────────────────────
const pagamentoEsquema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  status: z.string(),
  status_detail: z.string().nullish(),
  external_reference: z.string().nullish(),
  transaction_amount: z.number(),
  currency_id: z.string(),
  payment_type_id: z.string().nullish(),
  installments: z.number().int().nullish(),
});

export type PagamentoMP = z.infer<typeof pagamentoEsquema>;

/** Estado do pagamento lido da API com o nosso token. null: não existe nesta conta. */
export async function consultarPagamento(
  token: string,
  mpId: string,
): Promise<PagamentoMP | null> {
  if (!/^\d{1,20}$/.test(mpId)) return null;
  const r = await chamar(token, `/v1/payments/${mpId}`);
  if (r.status === 404 || r.status === 400) return null;
  if (!r.ok) throw new ErroPassageiro(`pagamento_${r.status}`);
  return pagamentoEsquema.parse(await r.json());
}

const buscaEsquema = z.object({
  results: z.array(
    z.object({ id: z.union([z.number(), z.string()]).transform(String) }),
  ),
});

/** Ids dos pagamentos de uma compra (conferência de 30 min). */
export async function buscarPagamentos(
  token: string,
  compra: string,
): Promise<string[]> {
  const q = new URLSearchParams({
    external_reference: compra,
    sort: "date_created",
    criteria: "desc",
    limit: "20",
  });
  const r = await chamar(token, `/v1/payments/search?${q}`);
  if (!r.ok) throw new ErroPassageiro(`busca_${r.status}`);
  return buscaEsquema.parse(await r.json()).results.map((p) => p.id);
}

// ── Assinatura do aviso ──────────────────────────────────────────────────
/** `ts=…,v1=…` → partes. Faltando qualquer uma, null. */
export function lerAssinatura(
  cabecalho: string | null,
): { ts: string; v1: string } | null {
  if (!cabecalho) return null;
  const partes = new Map(
    cabecalho.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const;
    }),
  );
  const ts = partes.get("ts");
  const v1 = partes.get("v1");
  return ts && v1 ? { ts, v1 } : null;
}

/**
 * HMAC-SHA256 de `id:{data.id};request-id:{x-request-id};ts:{ts};` com a assinatura secreta,
 * comparado em tempo constante. Qualquer coisa malformada é falso, nunca exceção.
 */
export function assinaturaConfere(d: {
  assinatura: string | null;
  requestId: string | null;
  dataId: string;
  segredo: string;
}): boolean {
  const a = lerAssinatura(d.assinatura);
  if (!a || !d.requestId || !d.dataId || !/^[0-9a-f]{64}$/i.test(a.v1))
    return false;
  const manifesto = `id:${d.dataId};request-id:${d.requestId};ts:${a.ts};`;
  const esperado = createHmac("sha256", d.segredo).update(manifesto).digest();
  const recebido = Buffer.from(a.v1, "hex");
  return (
    recebido.length === esperado.length && timingSafeEqual(recebido, esperado)
  );
}
