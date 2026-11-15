import "server-only";
// Prompt 13: gera os dois PDFs de uma versão publicada (T50). O evento leva só o id da versão e
// os passos devolvem só pasta e números (T36): os PDFs nunca passam pelo Inngest.
// O passo 1 faz tudo num passo só (fotos, Typst, mupdf, QR, upload); o 2 grava no banco.
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { TENTATIVAS_POR_PASSO } from "@/lib/config";
import { EVENTO_LIVRO_EXPORTAR } from "@/lib/livro/eventos";
import { paraFila } from "@/lib/livro/erros";
import {
  apagarPasta,
  gerarESubir,
  gravarPronto,
  marcarFalha,
} from "@/lib/livro/armazenar";
import { inngest } from "./cliente";

const dados = z.object({ export_id: z.uuid() });

export const exportarLivroFn = inngest.createFunction(
  {
    id: "livro-exportar",
    name: "Gerar os PDFs do livro",
    triggers: [{ event: EVENTO_LIVRO_EXPORTAR }],
    retries: (TENTATIVAS_POR_PASSO - 1) as 2,
    concurrency: [{ limit: 1, key: "event.data.export_id" }, { limit: 2 }],
    checkpointing: false,
    onFailure: async ({ event, error }) => {
      const original = dados.safeParse(event.data?.event?.data);
      if (!original.success) return;
      await marcarFalha(original.data.export_id, error?.message);
    },
  },
  async ({ event, step }) => {
    const d = dados.safeParse(event.data);
    if (!d.success) throw new NonRetriableError("evento:dados_invalidos");
    const id = d.data.export_id;
    const feito = await step.run("montar", async () => {
      try {
        return await gerarESubir(id);
      } catch (e) {
        throw paraFila(e);
      }
    });
    if (!feito) return { fim: "nada_a_fazer" as const };
    const fim = await step.run("gravar", async () => {
      try {
        return await gravarPronto(id, feito);
      } catch (e) {
        await apagarPasta(feito.pasta).catch(() => undefined);
        throw paraFila(e);
      }
    });
    return { fim, paginas: feito.paginas, qr: feito.qrConferidos };
  },
);
