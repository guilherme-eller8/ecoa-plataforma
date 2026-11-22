import "server-only";
// Uma função só para o aviso do Mercado Pago, a volta do navegador e a conferência de 30 min
// (T58). O estado vem sempre da API com o nosso token; o banco garante 1 livro por compra e
// as colunas fazem o e-mail de acesso e o alerta saírem 1 vez.
import { contaParaEmail, enviarAcesso } from "@/lib/acesso";
import { avisarAdminsDaCompra } from "@/lib/email/alerta";
import { envPagamento } from "@/lib/env-pagamento";
import { registrarEvento } from "@/lib/eventos";
import { clienteAdmin, type ClienteAdmin } from "@/lib/supabase/admin";
import { acaoDoStatus, valorConfere, type PagamentoEstado } from "./estado";
import {
  consultarPagamento,
  ErroPassageiro,
  type PagamentoMP,
} from "./mercado-pago";

export type Dependencias = {
  db: ClienteAdmin;
  consultar: (mpId: string) => Promise<PagamentoMP | null>;
  contaParaEmail: typeof contaParaEmail;
  enviarAcesso: typeof enviarAcesso;
  avisar: typeof avisarAdminsDaCompra;
  registrarEvento: typeof registrarEvento;
};

export function dependenciasReais(): Dependencias | null {
  const env = envPagamento();
  if (!env) return null;
  const db = clienteAdmin();
  return {
    db,
    consultar: (mpId) => consultarPagamento(env.MP_ACCESS_TOKEN, mpId),
    contaParaEmail,
    enviarAcesso,
    avisar: avisarAdminsDaCompra,
    registrarEvento,
  };
}

export type Processado =
  | { tipo: "ok"; compra: string; estado: PagamentoEstado }
  | { tipo: "ignorado"; motivo: string }
  | { tipo: "passageiro"; motivo: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Compra = {
  id: string;
  estado: PagamentoEstado;
  email: string;
  valor_centavos: number;
  book_id: string | null;
  acesso_enviado_em: string | null;
};

async function lerCompra(db: ClienteAdmin, id: string): Promise<Compra | null> {
  const { data, error } = await db
    .from("payments")
    .select("id, estado, email, valor_centavos, book_id, acesso_enviado_em")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ErroPassageiro("ler_compra");
  return data;
}

/**
 * Lê o pagamento `mpId` na API e leva a compra ao estado dele. `compraEsperada` (volta e
 * conferência) recusa um pagamento de outra compra. Nunca lança: falha passageira volta como
 * `passageiro`, para o aviso responder 500 e o Mercado Pago repetir.
 */
export async function processarPagamento(
  mpId: string,
  opcoes: { compraEsperada?: string } = {},
  deps: Dependencias | null = dependenciasReais(),
): Promise<Processado> {
  if (!deps) return { tipo: "ignorado", motivo: "sem_credenciais" };
  try {
    return await processar(mpId, opcoes, deps);
  } catch (e) {
    const motivo =
      e instanceof ErroPassageiro ? e.message : (e as Error).name || "erro";
    console.error("[pagamento] falha passageira", { mpId, motivo });
    return { tipo: "passageiro", motivo };
  }
}

async function processar(
  mpId: string,
  { compraEsperada }: { compraEsperada?: string },
  deps: Dependencias,
): Promise<Processado> {
  const pagamento = await deps.consultar(mpId);
  if (!pagamento) return { tipo: "ignorado", motivo: "pagamento_inexistente" };

  const ref = pagamento.external_reference ?? "";
  if (!UUID.test(ref)) return { tipo: "ignorado", motivo: "sem_referencia" };
  if (compraEsperada && ref !== compraEsperada)
    return { tipo: "ignorado", motivo: "outra_compra" };
  const compra = await lerCompra(deps.db, ref);
  if (!compra) return { tipo: "ignorado", motivo: "compra_inexistente" };

  const acao = acaoDoStatus(pagamento.status);
  if (acao.acao === "nada") {
    console.warn("[pagamento] status sem ação", {
      mpId,
      status: pagamento.status,
    });
    return { tipo: "ignorado", motivo: "status_desconhecido" };
  }

  const base = {
    p_compra: compra.id,
    p_mp_pagamento: pagamento.id,
    p_valor_centavos: null as number | null,
    p_meio: pagamento.payment_type_id ?? null,
    p_parcelas: pagamento.installments ?? null,
    p_responsavel: null as string | null,
    p_alerta: null as string | null,
  };

  let registro: Parameters<typeof registrar>[1];
  if (acao.acao === "aprovar") {
    // 1º valor e moeda; 2º a conta (só se a compra ainda não tem livro); 3º o banco.
    if (!valorConfere(pagamento, compra.valor_centavos)) {
      registro = { ...base, p_acao: "reter", p_alerta: "valor_diferente" };
    } else if (
      !compra.book_id &&
      compra.estado !== "retido" &&
      compra.estado !== "estornado"
    ) {
      // Aviso e volta juntos podem criar a mesma conta ao mesmo tempo: a 2ª criação falha, e
      // a 2ª busca já acha a conta da 1ª.
      let conta = await deps.contaParaEmail(compra.email, deps.db);
      if (conta.tipo === "erro")
        conta = await deps.contaParaEmail(compra.email, deps.db);
      if (conta.tipo === "erro") throw new ErroPassageiro("conta");
      registro =
        conta.tipo === "recusada"
          ? { ...base, p_acao: "reter", p_alerta: "conta_recusada" }
          : {
              ...base,
              p_acao: "aprovar",
              p_valor_centavos: compra.valor_centavos,
              p_responsavel: conta.id,
            };
    } else {
      registro = {
        ...base,
        p_acao: "aprovar",
        p_valor_centavos: compra.valor_centavos,
      };
    }
  } else if (acao.acao === "reter") {
    registro = { ...base, p_acao: "reter", p_alerta: acao.alerta };
  } else {
    registro = { ...base, p_acao: acao.acao };
  }

  const r = await registrar(deps.db, registro);

  if (r.novo && r.book_id)
    await deps.registrarEvento(
      {
        quem: null,
        papel: "sistema",
        acao: "plano_comprado",
        livro: r.book_id,
        detalhes: {
          meio: pagamento.payment_type_id ?? null,
          parcelas: pagamento.installments ?? null,
        },
      },
      {},
      deps.db,
    );

  if (r.alerta) await deps.avisar({ referencia: compra.id, alerta: r.alerta });

  const depois = await lerCompra(deps.db, compra.id);
  if (!depois) throw new ErroPassageiro("ler_compra");
  await garantirAcesso(depois, deps);
  return { tipo: "ok", compra: compra.id, estado: depois.estado };
}

async function registrar(
  db: ClienteAdmin,
  args: {
    p_compra: string;
    p_mp_pagamento: string;
    p_acao: "aprovar" | "pendente" | "recusado" | "estorno" | "reter";
    p_valor_centavos: number | null;
    p_meio: string | null;
    p_parcelas: number | null;
    p_responsavel: string | null;
    p_alerta: string | null;
  },
) {
  const { data, error } = await db.rpc("compra_registrar", args);
  if (error || !data?.[0]) throw new ErroPassageiro("registrar");
  return data[0];
}

/**
 * Compra aprovada sem `acesso_enviado_em` → e-mail de acesso. A decisão sai da coluna, não de
 * `novo`: um envio que caiu depois do commit sai na próxima chamada. Falhou → passageiro.
 */
export async function garantirAcesso(
  compra: Pick<Compra, "id" | "estado" | "book_id" | "acesso_enviado_em">,
  deps: Pick<Dependencias, "db" | "enviarAcesso">,
): Promise<void> {
  if (compra.estado !== "aprovado" || !compra.book_id) return;
  if (compra.acesso_enviado_em) return;
  const envio = await deps.enviarAcesso(compra.book_id, deps.db, {
    idempotencyKey: `compra:${compra.id}`,
  });
  if (!envio.ok) throw new ErroPassageiro("email_acesso");
  const { error } = await deps.db.rpc("compra_marcar_acesso", {
    p_compra: compra.id,
  });
  if (error) throw new ErroPassageiro("marcar_acesso");
}

/** Conferência: reenvia o acesso de uma compra aprovada que ficou sem e-mail. */
export async function reenviarAcessoDaCompra(
  compraId: string,
  deps: Dependencias | null = dependenciasReais(),
): Promise<Processado> {
  if (!deps) return { tipo: "ignorado", motivo: "sem_credenciais" };
  try {
    const compra = await lerCompra(deps.db, compraId);
    if (!compra) return { tipo: "ignorado", motivo: "compra_inexistente" };
    await garantirAcesso(compra, deps);
    return { tipo: "ok", compra: compra.id, estado: compra.estado };
  } catch (e) {
    return { tipo: "passageiro", motivo: (e as Error).message };
  }
}
