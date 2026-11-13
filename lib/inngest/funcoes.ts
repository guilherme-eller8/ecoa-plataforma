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
  EDICOES_SIMULTANEAS,
  ESPERA_LOTE_H,
  MAX_ARQUIVO_MIN,
  MODELOS_TRANSCRICAO,
  PROVEDOR_PADRAO,
  TENTATIVAS_POR_PASSO,
  VARREDURA_CONFIRMADA_MIN,
  VARREDURA_GRAVACAO_MIN,
  VARREDURA_PARADA_MIN,
} from "@/lib/config";
import { emailDivisaoPronta, emailHistoriaPronta } from "@/lib/email/modelos";
import { enviarEmail } from "@/lib/email/enviar";
import { urlDoApp } from "@/lib/env-servidor";
import { registrarEvento } from "@/lib/eventos";
import { bancoPipeline } from "@/lib/pipeline/banco";
import { publicarNoLivro } from "@/lib/pipeline/canal";
import { envPipeline } from "@/lib/pipeline/env";
import { lerErroPipeline, logarSemTexto } from "@/lib/pipeline/erros";
import {
  escreverHistoria,
  processarGravacao,
  type Dependencias,
  type Passos,
} from "@/lib/pipeline/processar";
import {
  EVENTO_GRAVACAO,
  EVENTO_HISTORIA_CONFIRMADA,
  chaveDoEvento,
} from "@/lib/pipeline/regras";
import { clienteAdmin } from "@/lib/supabase/admin";
import { inngest } from "./cliente";

// `chave` é opcional: eventos enviados antes do prompt 7 não a têm (a concorrência cai no id).
const dadosDoEvento = z.object({
  recordingId: z.uuid(),
  chave: z.uuid().optional(),
});
const dadosDaEscrita = z.object({ historiaId: z.uuid() });

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
    async avisarDivisao(para, apelido, historia) {
      const { data: s } = await db
        .from("stories")
        .select("book_id")
        .eq("id", historia)
        .maybeSingle();
      if (!s) return false;
      const r = await enviarEmail(
        para,
        emailDivisaoPronta({
          apelido,
          urlDivisao: `${urlDoApp()}/livro/${s.book_id}/historias/${historia}/dividir`,
        }),
        { idempotencyKey: `divisao:${historia}` },
      );
      return r.ok;
    },
    async registrarEvento(acao, livro, historia, detalhes) {
      await registrarEvento({
        quem: null,
        papel: "sistema",
        acao,
        livro,
        detalhes: { story: historia, ...detalhes },
      });
    },
  };
}

/** onFailure das duas funções: só muda quem está em andamento (nada desfaz o "pronta"). */
async function marcarFalha(historia: string, livro: string, erro?: string) {
  const { etapa, codigo } = lerErroPipeline(erro);
  const mudou = await bancoPipeline(clienteAdmin()).mudarEtapa(
    historia,
    "falhou",
    { etapa, codigo },
  );
  if (mudou)
    await publicarNoLivro(livro, {
      tipo: "etapa",
      historia,
      etapa: "falhou",
    }).catch((e) => logarSemTexto("publicar falha", e));
}

export const processarGravacaoFn = inngest.createFunction(
  {
    id: "processar-gravacao",
    name: "Processar gravação",
    triggers: [{ event: EVENTO_GRAVACAO }],
    retries: (TENTATIVAS_POR_PASSO - 1) as 2,
    // Prompt 7: as partes de um lote passam uma de cada vez (o contêiner é um só).
    concurrency: {
      limit: 1,
      key: "has(event.data.chave) ? event.data.chave : event.data.recordingId",
    },
    // Cada passo numa chamada própria, com o teto inteiro da função (300 s no Hobby).
    checkpointing: false,
    onFailure: async ({ event, error }) => {
      const original = dadosDoEvento.safeParse(event.data?.event?.data);
      if (!original.success) return;
      // O contêiner: a história mais antiga da gravação.
      const db = clienteAdmin();
      const { data: srs } = await db
        .from("story_recordings")
        .select("story_id")
        .eq("recording_id", original.data.recordingId);
      const ids = (srs ?? []).map((x) => x.story_id);
      if (!ids.length) return;
      const { data: s } = await db
        .from("stories")
        .select("id, book_id")
        .in("id", ids)
        .order("criado_em")
        .limit(1)
        .maybeSingle();
      if (s) await marcarFalha(s.id, s.book_id, error?.message);
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

/** Prompt 7: escreve uma história que saiu de uma divisão confirmada. */
export const escreverHistoriaFn = inngest.createFunction(
  {
    id: "escrever-historia",
    name: "Escrever história",
    triggers: [{ event: EVENTO_HISTORIA_CONFIRMADA }],
    retries: (TENTATIVAS_POR_PASSO - 1) as 2,
    concurrency: [
      { limit: 1, key: "event.data.historiaId" },
      { limit: EDICOES_SIMULTANEAS }, // uma divisão de 30 histórias não abre 30 edições de uma vez
    ],
    checkpointing: false,
    onFailure: async ({ event, error }) => {
      const original = dadosDaEscrita.safeParse(event.data?.event?.data);
      if (!original.success) return;
      const { data: s } = await clienteAdmin()
        .from("stories")
        .select("book_id")
        .eq("id", original.data.historiaId)
        .maybeSingle();
      if (s)
        await marcarFalha(original.data.historiaId, s.book_id, error?.message);
    },
  },
  async ({ event, step }) => {
    const dados = dadosDaEscrita.safeParse(event.data);
    if (!dados.success) throw new NonRetriableError("evento:dados_invalidos");
    const d = dependencias();
    const historia = dados.data.historiaId;
    const passos = step as unknown as Passos;
    const r = await passos.run("retomar", async () => {
      const info = await d.banco.info(historia);
      if (!info) return { seguir: false, livro: null, estado: null };
      const seguir = info.estado === "ouvindo" || info.estado === "escrevendo";
      // O cartão sai de "Conferir" assim que a escrita começa.
      if (seguir)
        await d
          .publicar(info.livro, { tipo: "etapa", historia, etapa: "ouvindo" })
          .catch((e) => logarSemTexto("publicar retomar", e));
      return { seguir, livro: info.livro, estado: info.estado };
    });
    if (!r.seguir || !r.livro)
      return { fim: "ja_estava" as const, estado: r.estado };
    return escreverHistoria(historia, r.livro, d, passos);
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
      // Prompt 7: toda origem; 7 dias (a cota diária pode adiar um lote para amanhã).
      const { data: candidatas } = await db
        .from("recordings")
        .select("id, book_id, lote_id, lote_total, recebido_em")
        .eq("upload", "recebido")
        .is("processado_em", null)
        .lte("duracao_s", MAX_ARQUIVO_MIN * 60)
        .lt(
          "recebido_em",
          new Date(agora - VARREDURA_GRAVACAO_MIN * 60_000).toISOString(),
        )
        .gt("recebido_em", new Date(agora - 7 * 24 * 3600_000).toISOString())
        .order("recebido_em")
        .limit(200);
      const lista = candidatas ?? [];
      if (lista.length === 0) return 0;
      const lotes = [
        ...new Set(lista.flatMap((g) => (g.lote_id ? [g.lote_id] : []))),
      ];
      const [{ data: comHistoria }, { data: livros }, { data: doLote }] =
        await Promise.all([
          db
            .from("story_recordings")
            .select("recording_id")
            .in(
              "recording_id",
              lista.map((g) => g.id),
            ),
          db
            .from("books")
            .select("id")
            .in("id", [...new Set(lista.map((g) => g.book_id))])
            .not("ia_consentimento_em", "is", null),
          lotes.length
            ? db
                .from("recordings")
                .select("lote_id")
                .in("lote_id", lotes)
                .eq("upload", "recebido")
            : Promise.resolve({ data: [] as { lote_id: string | null }[] }),
        ]);
      const ja = new Set((comHistoria ?? []).map((s) => s.recording_id));
      const consentidos = new Set((livros ?? []).map((b) => b.id));
      const recebidas = new Map<string, number>();
      for (const r of doLote ?? [])
        if (r.lote_id)
          recebidas.set(r.lote_id, (recebidas.get(r.lote_id) ?? 0) + 1);
      // Lote ainda incompleto e com menos de 6 h: o banco diria "espere"; não gasta execução.
      const esperando = (g: (typeof lista)[number]) =>
        g.lote_id !== null &&
        g.lote_total !== null &&
        (recebidas.get(g.lote_id) ?? 0) < g.lote_total &&
        agora - new Date(g.recebido_em ?? 0).getTime() <
          ESPERA_LOTE_H * 3600_000;
      const orfas = lista
        .filter(
          (g) => !ja.has(g.id) && consentidos.has(g.book_id) && !esperando(g),
        )
        .slice(0, 50);
      const janela = Math.floor(agora / (15 * 60_000));
      if (orfas.length)
        await inngest.send(
          orfas.map((g) => {
            const chave = chaveDoEvento(g);
            return {
              name: EVENTO_GRAVACAO,
              id: `${chave === g.id ? g.id : `${chave}:${g.id}`}:varredura:${janela}`,
              data: { recordingId: g.id, chave },
            };
          }),
        );
      return orfas.length;
    });

    // Prompt 7: história que saiu de uma divisão confirmada e não começou a ser escrita
    // (evento perdido): reenvia antes de qualquer "parada".
    const retomadas = await step.run("confirmadas", async () => {
      const db = clienteAdmin();
      const agora = Date.now();
      const { data } = await db
        .from("stories")
        .select("id, divisao_de, divisao")
        .eq("estado", "ouvindo")
        .lt(
          "atualizado_em",
          new Date(agora - VARREDURA_CONFIRMADA_MIN * 60_000).toISOString(),
        )
        .gt(
          "atualizado_em",
          new Date(agora - VARREDURA_PARADA_MIN * 60_000).toISOString(),
        )
        .limit(50);
      const ids = (data ?? [])
        .filter(
          (s) =>
            s.divisao_de ||
            Boolean((s.divisao as { final?: unknown } | null)?.final),
        )
        .map((s) => s.id);
      const janela = Math.floor(agora / (15 * 60_000));
      if (ids.length)
        await inngest.send(
          ids.map((historiaId) => ({
            name: EVENTO_HISTORIA_CONFIRMADA,
            id: `historia:${historiaId}:varredura:${janela}`,
            data: { historiaId },
          })),
        );
      return ids.length;
    });

    const paradas = await step.run("paradas", async () => {
      const db = clienteAdmin();
      const limite = new Date(
        Date.now() - VARREDURA_PARADA_MIN * 60_000,
      ).toISOString();
      const { data } = await db
        .from("stories")
        .select("id, book_id")
        .in("estado", ["ouvindo", "escrevendo", "dividindo"])
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

    return { reenviadas, retomadas, paradas };
  },
);

export const funcoes = [processarGravacaoFn, escreverHistoriaFn, varreduraFn];
