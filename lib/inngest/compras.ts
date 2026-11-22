import "server-only";
// Conferência a cada 30 min (T58): a rede de segurança do aviso do Mercado Pago. Cobre aviso
// perdido, app fora do ar, volta sem payment_id e e-mail de acesso que caiu. Só produção
// (T57: o preview recusa /api/inngest). Os passos devolvem só ids e contagens (T36).
import { cron } from "inngest";
import { envPagamento } from "@/lib/env-pagamento";
import { buscarPagamentos } from "@/lib/pagamento/mercado-pago";
import {
  processarPagamento,
  reenviarAcessoDaCompra,
} from "@/lib/pagamento/processar";
import { clienteAdmin } from "@/lib/supabase/admin";
import { inngest } from "./cliente";

export const comprasConferirFn = inngest.createFunction(
  {
    id: "compras-conferir",
    name: "Conferir compras do Mercado Pago",
    triggers: [cron("TZ=America/Sao_Paulo */30 * * * *")],
    retries: 1,
    checkpointing: false,
  },
  async ({ step }) => {
    const env = envPagamento();
    if (!env) return { compras: 0, sem_credenciais: true };

    const lista = await step.run("lista", async () => {
      const { data, error } = await clienteAdmin().rpc("compras_para_conferir");
      if (error) throw new Error("compras_para_conferir");
      return (data ?? []).map((c) => ({ id: c.id, estado: c.estado }));
    });

    let passageiras = 0;
    for (const compra of lista) {
      const r = await step.run(`compra-${compra.id}`, async () => {
        if (compra.estado === "aprovado") {
          const a = await reenviarAcessoDaCompra(compra.id);
          return {
            pagamentos: 0,
            passageiras: a.tipo === "passageiro" ? 1 : 0,
          };
        }
        const ids = await buscarPagamentos(
          env.MP_ACCESS_TOKEN,
          compra.id,
        ).catch(() => null);
        if (!ids) return { pagamentos: 0, passageiras: 1 };
        let falhas = 0;
        // Do mais antigo ao mais novo: o aprovado vence, e o recusado atrasado não o desfaz.
        for (const mpId of ids.reverse()) {
          const p = await processarPagamento(mpId, {
            compraEsperada: compra.id,
          });
          if (p.tipo === "passageiro") falhas++;
        }
        return { pagamentos: ids.length, passageiras: falhas };
      });
      passageiras += r.passageiras;
    }
    // A próxima rodada, em 30 min, tenta as passageiras de novo.
    return { compras: lista.length, passageiras };
  },
);
