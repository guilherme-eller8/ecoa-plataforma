import "server-only";
// Prompt 10: recorte do áudio do QR (T45). O evento leva só o código; os passos devolvem só
// caminhos, tempos e a fonte (T36). O banco confere fonte e duração no último passo.
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { TENTATIVAS_POR_PASSO } from "@/lib/config";
import { codigoValido } from "@/lib/qr/codigo";
import { EVENTO_QR_RECORTAR } from "@/lib/qr/eventos";
import {
  cortarESubir,
  gravarRecorte,
  planejarRecorte,
} from "@/lib/qr/recortar";
import { inngest } from "./cliente";

const dados = z.object({ codigo: z.string().refine(codigoValido) });

export const recortarQrFn = inngest.createFunction(
  {
    id: "qr-recortar",
    name: "Recorte do áudio do QR",
    triggers: [{ event: EVENTO_QR_RECORTAR }],
    retries: (TENTATIVAS_POR_PASSO - 1) as 2,
    concurrency: [{ limit: 1, key: "event.data.codigo" }, { limit: 2 }],
    checkpointing: false,
  },
  async ({ event, step }) => {
    const d = dados.safeParse(event.data);
    if (!d.success) throw new NonRetriableError("evento:dados_invalidos");
    const { codigo } = d.data;
    const plano = await step.run("trechos", () => planejarRecorte(codigo));
    if (!plano) return { fim: "nada_a_fazer" as const };
    const recorte = await step.run("cortar", () => cortarESubir(codigo, plano));
    const fim = await step.run("gravar", () =>
      gravarRecorte(codigo, plano.fonte, recorte),
    );
    return { fim, duracao: recorte.duracao };
  },
);
