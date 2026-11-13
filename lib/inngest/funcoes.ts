import "server-only";
// Funções do Inngest (T34). O Inngest só orquestra: o código roda aqui, na Vercel, e cada
// passo devolve só ids e contagens (T36). Design: docs/designs/pipeline-texto-ao-vivo.md.
import { join } from "node:path";
import { NonRetriableError, cron } from "inngest";
import { z } from "zod";
import { leitorDeDiretorio } from "@/lib/ai/carregar-prompt";
import { ClienteAnthropic } from "@/lib/ai/claude";
import { TRANSCRITORES } from "@/lib/ai/transcricao";
import {
  MAX_HISTORIA_MIN,
  MODELOS_TRANSCRICAO,
  PROVEDOR_PADRAO,
  TENTATIVAS_POR_PASSO,
  VARREDURA_GRAVACAO_MIN,
  VARREDURA_PARADA_MIN,
} from "@/lib/config";
import { emailHistoriaPronta } from "@/lib/email/modelos";
import { enviarEmail } from "@/lib/email/enviar";
import { urlDoApp } from "@/lib/env-servidor";
import { registrarEvento } from "@/lib/eventos";
import { bancoPipeline } from "@/lib/pipeline/banco";
import { publicarNoLivro } from "@/lib/pipeline/canal";
import { envPipeline } from "@/lib/pipeline/env";
import { lerErroPipeline, logarSemTexto } from "@/lib/pipeline/erros";
import {
  processarGravacao,
  type Dependencias,
  type Passos,
} from "@/lib/pipeline/processar";
import { EVENTO_GRAVACAO, ORIGENS_AVULSAS } from "@/lib/pipeline/regras";
import { clienteAdmin } from "@/lib/supabase/admin";
import { inngest } from "./cliente";

const dadosDoEvento = z.object({ recordingId: z.uuid() });

function dependencias(): Dependencias {
  const env = envPipeline();
  const db = clienteAdmin();
  const banco = bancoPipeline(db);
  return {
    banco,
    ia: new ClienteAnthropic(),
    ler: leitorDeDiretorio(join(process.cwd(), "lib/ai/prompts")),
    transcrever: TRANSCRITORES[PROVEDOR_PADRAO].transcrever,
    provedor: PROVEDOR_PADRAO,
    modeloTranscricao: MODELOS_TRANSCRICAO[PROVEDOR_PADRAO],
    chaveTranscricao: env.ELEVENLABS_API_KEY,
    async baixarAudio(caminho) {
      const { data, error } = await db.storage.from("audios").download(caminho);
      if (error || !data) throw new Error("audio_ausente");
      return new Uint8Array(await data.arrayBuffer());
    },
    publicar: publicarNoLivro,
    async avisarPorEmail(para, apelido, historia) {
      const { data: s } = await db
        .from("stories")
        .select("book_id")
        .eq("id", historia)
        .maybeSingle();
      if (!s) return false;
      const r = await enviarEmail(
        para,
        emailHistoriaPronta({
          apelido,
          urlHistoria: `${urlDoApp()}/livro/${s.book_id}/historias/${historia}`,
        }),
        { idempotencyKey: `historia_pronta:${historia}` },
      );
      return r.ok;
    },
    async registrarEvento(acao, livro, historia) {
      await registrarEvento({
        quem: null,
        papel: "sistema",
        acao,
        livro,
        detalhes: { story: historia },
      });
    },
  };
}

export const processarGravacaoFn = inngest.createFunction(
  {
    id: "processar-gravacao",
    name: "Processar gravação",
    triggers: [{ event: EVENTO_GRAVACAO }],
    retries: (TENTATIVAS_POR_PASSO - 1) as 2,
    concurrency: { limit: 1, key: "event.data.recordingId" },
    // Cada passo numa chamada própria, com o teto inteiro da função (300 s no Hobby).
    checkpointing: false,
    onFailure: async ({ event, error }) => {
      const original = dadosDoEvento.safeParse(event.data?.event?.data);
      if (!original.success) return;
      const { etapa, codigo } = lerErroPipeline(error?.message);
      const db = clienteAdmin();
      const { data: sr } = await db
        .from("story_recordings")
        .select("story_id, book_id")
        .eq("recording_id", original.data.recordingId)
        .order("ordem")
        .limit(1)
        .maybeSingle();
      if (!sr) return;
      // Só muda quem está em andamento: uma falha depois do "pronta" não desfaz nada.
      const mudou = await bancoPipeline(db).mudarEtapa(sr.story_id, "falhou", {
        etapa,
        codigo,
      });
      if (mudou)
        await publicarNoLivro(sr.book_id, {
          tipo: "etapa",
          historia: sr.story_id,
          etapa: "falhou",
        }).catch((e) => logarSemTexto("publicar falha", e));
    },
  },
  async ({ event, step }) => {
    const dados = dadosDoEvento.safeParse(event.data);
    if (!dados.success) throw new NonRetriableError("evento:dados_invalidos");
    return processarGravacao(
      dados.data.recordingId,
      dependencias(),
      step as unknown as Passos,
    );
  },
);

/**
 * A cada 15 min: reenvia gravações recebidas que ficaram sem história (evento perdido) e
 * marca como "parada" a história em andamento há tempo demais. Nada fica preso em "Ouvindo…".
 */
export const varreduraFn = inngest.createFunction(
  {
    id: "varredura-pipeline",
    name: "Varredura do pipeline",
    triggers: [cron("*/15 * * * *")],
    retries: 1,
    checkpointing: false,
  },
  async ({ step }) => {
    const reenviadas = await step.run("orfas", async () => {
      const db = clienteAdmin();
      const agora = Date.now();
      const { data: candidatas } = await db
        .from("recordings")
        .select("id, book_id, duracao_s")
        .eq("upload", "recebido")
        .is("processado_em", null)
        .in("origem", [...ORIGENS_AVULSAS])
        .lte("duracao_s", MAX_HISTORIA_MIN * 60)
        .lt(
          "recebido_em",
          new Date(agora - VARREDURA_GRAVACAO_MIN * 60_000).toISOString(),
        )
        .gt("recebido_em", new Date(agora - 24 * 3600_000).toISOString())
        .limit(50);
      const ids = (candidatas ?? []).map((g) => g.id);
      if (ids.length === 0) return 0;
      const [{ data: comHistoria }, { data: livros }] = await Promise.all([
        db
          .from("story_recordings")
          .select("recording_id")
          .in("recording_id", ids),
        db
          .from("books")
          .select("id")
          .in("id", [...new Set((candidatas ?? []).map((g) => g.book_id))])
          .not("ia_consentimento_em", "is", null),
      ]);
      const ja = new Set((comHistoria ?? []).map((s) => s.recording_id));
      const consentidos = new Set((livros ?? []).map((b) => b.id));
      const orfas = (candidatas ?? []).filter(
        (g) => !ja.has(g.id) && consentidos.has(g.book_id),
      );
      const janela = Math.floor(agora / (15 * 60_000));
      if (orfas.length)
        await inngest.send(
          orfas.map((g) => ({
            name: EVENTO_GRAVACAO,
            id: `${g.id}:varredura:${janela}`,
            data: { recordingId: g.id },
          })),
        );
      return orfas.length;
    });

    const paradas = await step.run("paradas", async () => {
      const db = clienteAdmin();
      const limite = new Date(
        Date.now() - VARREDURA_PARADA_MIN * 60_000,
      ).toISOString();
      const { data } = await db
        .from("stories")
        .select("id, book_id")
        .in("estado", ["ouvindo", "escrevendo"])
        .lt("atualizado_em", limite)
        .limit(50);
      const banco = bancoPipeline(db);
      let n = 0;
      for (const s of data ?? []) {
        if (
          await banco.mudarEtapa(s.id, "falhou", {
            etapa: "varredura",
            codigo: "parada",
          })
        ) {
          n++;
          await publicarNoLivro(s.book_id, {
            tipo: "etapa",
            historia: s.id,
            etapa: "falhou",
          }).catch((e) => logarSemTexto("publicar parada", e));
        }
      }
      return n;
    });

    return { reenviadas, paradas };
  },
);

export const funcoes = [processarGravacaoFn, varreduraFn];
