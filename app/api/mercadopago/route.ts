// Aviso do Mercado Pago (T58). A assinatura é conferida, mas o estado vem sempre da API com o
// nosso token (processarPagamento). O corpo é ignorado: o id processado é o `data.id` da
// query, o mesmo que entra na assinatura. Fora do matcher do proxy.ts: o aviso não tem sessão.
import { NextResponse, type NextRequest } from "next/server";
import { avisarAdminsDaCompra } from "@/lib/email/alerta";
import { envPagamento } from "@/lib/env-pagamento";
import { assinaturaConfere } from "@/lib/pagamento/mercado-pago";
import { processarPagamento } from "@/lib/pagamento/processar";

export const maxDuration = 60;

const resposta = (status: number) => new NextResponse(null, { status });

export async function POST(request: NextRequest) {
  const env = envPagamento();
  if (!env) return resposta(503);

  const busca = request.nextUrl.searchParams;
  // O Mercado Pago assina o id em minúsculas (ids alfanuméricos).
  const dataId = (busca.get("data.id") ?? busca.get("id") ?? "").toLowerCase();
  if (
    !assinaturaConfere({
      assinatura: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId,
      segredo: env.MP_WEBHOOK_SEGREDO,
    })
  )
    return resposta(401);

  const topico = busca.get("type") ?? busca.get("topic") ?? "";
  if (topico === "payment") {
    const r = await processarPagamento(dataId);
    return resposta(r.tipo === "passageiro" ? 500 : 200);
  }
  if (topico.includes("chargeback")) {
    // Contestação: o id é o do chargeback, sem a nossa compra. O admin confere no painel.
    // A chave do Resend segura as repetições do mesmo aviso.
    await avisarAdminsDaCompra({
      referencia: `contestacao-${dataId.slice(0, 40)}`,
      alerta: "contestacao",
    });
    return resposta(200);
  }
  return resposta(200);
}
