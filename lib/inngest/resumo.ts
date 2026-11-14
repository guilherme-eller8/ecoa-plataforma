import "server-only";
// Prompt 11 (P63): resumo semanal, domingo 18 h de Brasília. Um evento por livro (id por
// livro e dia: o Inngest descarta repetido) e um passo por membro (retry refaz só aquele).
import { NonRetriableError, cron } from "inngest";
import { z } from "zod";
import { registrarEvento } from "@/lib/eventos";
import {
  enviarResumoAoMembro,
  livrosParaResumo,
  membrosParaResumo,
  numerosDoResumo,
  temAlgo,
} from "@/lib/resumo/enviar";
import { EVENTO_RESUMO_LIVRO, idDoResumo } from "@/lib/resumo/eventos";
import { inngest } from "./cliente";

export const resumoSemanalFn = inngest.createFunction(
  {
    id: "resumo-semanal",
    name: "Resumo semanal (domingo)",
    triggers: [cron("TZ=America/Sao_Paulo 0 18 * * 0")],
    retries: 2,
    checkpointing: false,
  },
  async ({ step }) => {
    const livros = await step.run("livros", livrosParaResumo);
    if (!livros.length) return { livros: 0 };
    const agora = new Date();
    await step.sendEvent(
      "um-por-livro",
      livros.map((livro) => ({
        id: idDoResumo(livro, agora),
        name: EVENTO_RESUMO_LIVRO,
        data: { livro },
      })),
    );
    return { livros: livros.length };
  },
);

const dados = z.object({ livro: z.uuid() });

export const resumoDoLivroFn = inngest.createFunction(
  {
    id: "resumo-semanal-livro",
    name: "Resumo semanal de um livro",
    triggers: [{ event: EVENTO_RESUMO_LIVRO }],
    retries: 2,
    concurrency: [{ limit: 5 }],
    checkpointing: false,
  },
  async ({ event, step }) => {
    const d = dados.safeParse(event.data);
    if (!d.success) throw new NonRetriableError("evento:dados_invalidos");
    const { livro } = d.data;
    const numeros = await step.run("numeros", () => numerosDoResumo(livro));
    if (!temAlgo(numeros)) return { enviados: 0 };
    const membros = await step.run("membros", () => membrosParaResumo(livro));
    let enviados = 0;
    for (const m of membros) {
      const saiu = await step.run(m.membro, () =>
        enviarResumoAoMembro(livro, m, numeros, `${event.id ?? livro}-${m.membro}`),
      );
      if (saiu) enviados++;
    }
    await step.run("evento", () =>
      registrarEvento({
        quem: null,
        papel: "sistema",
        acao: "resumo_enviado",
        livro,
        detalhes: { membros: enviados },
      }),
    );
    return { enviados };
  },
);
