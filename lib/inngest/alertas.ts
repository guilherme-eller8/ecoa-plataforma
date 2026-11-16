import "server-only";
// Evals 1A: a cada 30 min, confere fila parada, gasto e cotas e avisa os admins por e-mail.
// No máximo 1 aviso por condição (e livro) por dia: a chave de idempotência do Resend leva o
// dia de Brasília. Os passos devolvem só ids e números (T36).
import { cron } from "inngest";
import { diaBrasilia } from "@/lib/aderencia/calculo";
import { adminsParaAvisar } from "@/lib/email/alerta";
import { enviarEmail } from "@/lib/email/enviar";
import { emailAlerta } from "@/lib/email/modelos";
import { urlDoApp } from "@/lib/env-servidor";
import { alertasDe, chaveDoAlerta } from "@/lib/evals/alertas";
import { fotoDosAlertas } from "@/lib/evals/alertas-dados";
import { inngest } from "./cliente";

export const alertasAdminFn = inngest.createFunction(
  {
    id: "alertas-admin",
    name: "Alertas ao admin (fila, gasto, cotas)",
    triggers: [cron("TZ=America/Sao_Paulo */30 * * * *")],
    retries: 1,
    checkpointing: false,
  },
  async ({ step }) => {
    const foto = await step.run("foto", () => fotoDosAlertas());
    const alertas = alertasDe(foto);
    if (!alertas.length) return { alertas: 0, enviados: 0 };
    const enviados = await step.run("enviar", async () => {
      const admins = await adminsParaAvisar();
      const dia = diaBrasilia(new Date());
      const url = `${urlDoApp()}/admin/evals`;
      let n = 0;
      for (const a of alertas)
        for (const admin of admins) {
          const r = await enviarEmail(
            admin.email,
            emailAlerta({ titulo: a.titulo, linhas: a.linhas, urlAdmin: url }),
            { idempotencyKey: chaveDoAlerta(a, dia, admin.id) },
          );
          if (r.ok && !r.repetido) n++; // repetido: já avisado hoje
        }
      return n;
    });
    return {
      alertas: alertas.length,
      condicoes: alertas.map((a) => a.condicao),
      enviados,
    };
  },
);
