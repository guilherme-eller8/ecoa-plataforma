// Regras puras da compra (prompt 14, parte 1; design em docs/designs/compra-mercado-pago.md).
// Servem ao servidor, às telas e aos testes: nada aqui fala com rede ou banco.
import type { Database } from "@/lib/supabase/tipos";

export type PagamentoEstado = Database["public"]["Enums"]["pagamento_estado"];

export type AlertaCompra =
  | "valor_diferente"
  | "conta_recusada"
  | "pagamento_duplicado"
  | "segunda_compra_24h"
  | "estorno"
  | "mediacao"
  | "estorno_parcial"
  | "contestacao";

/** Frase de cada alerta, para o e-mail e a lista do admin. Só o fato, sem dado do cliente. */
export const FRASE_DO_ALERTA: Record<AlertaCompra, string> = {
  valor_diferente: "Valor ou moeda diferente do plano. Nenhum livro criado.",
  conta_recusada:
    "A conta deste e-mail não pode ser usada. Nenhum livro criado.",
  pagamento_duplicado: "Segundo pagamento aprovado na mesma compra.",
  segunda_compra_24h:
    "Segunda compra aprovada do mesmo e-mail em 24 h (pode ser engano).",
  estorno: "Pagamento estornado ou devolvido.",
  mediacao: "Pagamento em mediação no Mercado Pago.",
  estorno_parcial: "Estorno parcial do pagamento.",
  contestacao: "Contestação (chargeback) aberta no Mercado Pago.",
};

export function fraseDoAlerta(alerta: string): string {
  return (FRASE_DO_ALERTA as Record<string, string>)[alerta] ?? alerta;
}

export type AcaoDoStatus =
  | { acao: "aprovar" | "pendente" | "recusado" | "estorno" }
  | { acao: "reter"; alerta: "mediacao" | "estorno_parcial" }
  | { acao: "nada" };

/** O que o `status` do Mercado Pago quer dizer para a compra. Status desconhecido: nada. */
export function acaoDoStatus(status: string): AcaoDoStatus {
  switch (status) {
    case "approved":
      return { acao: "aprovar" };
    case "pending":
    case "in_process":
    case "authorized":
      return { acao: "pendente" };
    case "rejected":
    case "cancelled":
      return { acao: "recusado" };
    case "refunded":
    case "charged_back":
      return { acao: "estorno" };
    case "in_mediation":
      return { acao: "reter", alerta: "mediacao" };
    case "partially_refunded":
      return { acao: "reter", alerta: "estorno_parcial" };
    default:
      return { acao: "nada" };
  }
}

/** Reais da API (número com casas) para centavos, sem o erro do ponto flutuante. */
export function emCentavos(reais: number): number {
  return Math.round(reais * 100);
}

/** O pagamento é do valor da compra, em reais. Juros do parcelamento não entram aqui (P78). */
export function valorConfere(
  pagamento: { currency_id: string; transaction_amount: number },
  valorCentavos: number,
): boolean {
  return (
    pagamento.currency_id === "BRL" &&
    emCentavos(pagamento.transaction_amount) === valorCentavos
  );
}

export type EstadoDaTela = "pronto" | "esperando" | "nao_passou" | "conferindo";

/** Os 4 estados da volta (`/comprar/pronto/{compra}`). */
export function estadoDaTela(estado: PagamentoEstado): EstadoDaTela {
  if (estado === "aprovado") return "pronto";
  if (estado === "recusado") return "nao_passou";
  if (estado === "retido" || estado === "estornado") return "conferindo";
  return "esperando";
}

const FINAIS: PagamentoEstado[] = ["aprovado", "retido", "estornado"];

/**
 * A volta só consulta a API quando pode mudar algo: compra fora de estado final, um
 * `payment_id` que não é o já gravado e a última mudança há mais de `minimoS`. Assim a URL não
 * vira um amplificador de chamadas.
 */
export function deveConsultarNaVolta(
  compra: {
    estado: PagamentoEstado;
    mp_pagamento_id: string | null;
    atualizado_em: string;
  },
  pagamentoDaUrl: string | null,
  minimoS: number,
  agora = Date.now(),
): boolean {
  if (!pagamentoDaUrl || !/^\d{1,20}$/.test(pagamentoDaUrl)) return false;
  if (FINAIS.includes(compra.estado)) return false;
  if (compra.mp_pagamento_id === pagamentoDaUrl) return false;
  return agora - Date.parse(compra.atualizado_em) > minimoS * 1000;
}

// Erros comuns de digitação nos domínios mais usados no Brasil (CUJ 5).
const DOMINIOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.com.br": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotamil.com": "hotmail.com",
  "homail.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "otlook.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.com.b": "yahoo.com.br",
  "yaho.com.br": "yahoo.com.br",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.co": "icloud.com",
  "uol.com.b": "uol.com.br",
  "bol.com.b": "bol.com.br",
};

/** "fulano@gmial.com" → "fulano@gmail.com". null se não houver o que sugerir. */
export function sugerirDominio(email: string): string | null {
  const limpo = email.trim().toLowerCase();
  const arroba = limpo.lastIndexOf("@");
  if (arroba < 1) return null;
  const certo = DOMINIOS[limpo.slice(arroba + 1)];
  return certo ? `${limpo.slice(0, arroba)}@${certo}` : null;
}

/** E-mail aceito pela compra: minúsculo, sem espaços, com cara de e-mail. */
export function emailDaCompra(entrada: string): string | null {
  const email = entrada.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || /\s/.test(email)) return null;
  return /^[^@]+@[^@]+\.[a-z]{2,}$/.test(email) ? email : null;
}
