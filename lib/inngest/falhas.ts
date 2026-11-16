import "server-only";
// Prompt 15: todo job que esgota as tentativas vira um evento `job_falhou` em events, para o
// admin listar. Guarda só ids (função, run, livro): nunca a mensagem do erro nem o payload (T36).
import { z } from "zod";
import { avisarAdminsDoJob } from "@/lib/email/alerta";
import { registrarEvento } from "@/lib/eventos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { inngest } from "./cliente";

const ID_DESTA_FUNCAO = "registrar-falha";
// Estas já avisam quando a história falha (marcarFalha, com o tipo da falha: áudio sem fala é
// a pessoa quem resolve e não vira e-mail). As outras avisam aqui (T56).
const JA_AVISAM = ["processar-gravacao", "escrever-historia"];

const falha = z.object({
  function_id: z.string().max(120),
  run_id: z.string().max(64),
  event: z
    .object({ data: z.record(z.string(), z.unknown()).optional() })
    .optional(),
});

const uuid = z.uuid();

/** O livro do evento original, quando dá para achar sem adivinhar. Nunca lança. */
async function livroDoEvento(
  dados: Record<string, unknown> | undefined,
): Promise<string | null> {
  if (!dados) return null;
  const direto = uuid.safeParse(dados.livro);
  if (direto.success) return direto.data;
  const db = clienteAdmin();
  const gravacao = uuid.safeParse(dados.recordingId);
  if (gravacao.success) {
    const { data } = await db
      .from("recordings")
      .select("book_id")
      .eq("id", gravacao.data)
      .maybeSingle();
    return data?.book_id ?? null;
  }
  const historia = uuid.safeParse(dados.historiaId);
  if (historia.success) {
    const { data } = await db
      .from("stories")
      .select("book_id")
      .eq("id", historia.data)
      .maybeSingle();
    return data?.book_id ?? null;
  }
  return null;
}

export const registrarFalhaFn = inngest.createFunction(
  {
    id: ID_DESTA_FUNCAO,
    name: "Registrar job que falhou",
    triggers: [{ event: "inngest/function.failed" }],
    retries: 0, // se esta falhar, o evento de falha dela mesma é ignorado abaixo (sem laço)
    checkpointing: false,
  },
  async ({ event }) => {
    const dados = falha.safeParse(event.data);
    if (!dados.success) return { registrado: false };
    // "ecoa-plataforma-registrar-falha": nunca registra a própria falha.
    if (dados.data.function_id.endsWith(ID_DESTA_FUNCAO))
      return { registrado: false };
    const livro = await livroDoEvento(dados.data.event?.data).catch(() => null);
    const { ok } = await registrarEvento({
      quem: null,
      papel: "sistema",
      acao: "job_falhou",
      livro,
      detalhes: {
        funcao: dados.data.function_id,
        run_id: dados.data.run_id,
      },
    });
    const funcao = dados.data.function_id;
    const avisados = JA_AVISAM.some((id) => funcao.endsWith(id))
      ? 0
      : await avisarAdminsDoJob({
          funcao,
          runId: dados.data.run_id,
          livro,
        }).catch(() => 0);
    return { registrado: ok, avisados };
  },
);
