"use server";

// Ações do link de mensagens (sem login, P65). Todas as funções do banco são só da chave secreta
// (T48): o servidor é o único caminho, o aparelho vem do cookie da rota /m e o banco confere
// token, aparelho e tetos de novo. Nenhum texto da mensagem vai para log ou evento.

import { cookies } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { TRANSCRITORES } from "@/lib/ai/transcricao";
import { arquivoDaMensagem, tipoDoAudio } from "@/lib/arquivos";
import {
  CONSENTIMENTO_MENSAGEM_VERSAO,
  MAX_MENSAGEM_AUDIO_MB,
  MAX_MENSAGEM_AUDIO_MIN,
  MAX_MENSAGEM_CARACTERES,
  MAX_MENSAGEM_FOTO_MB,
  MODELOS_TRANSCRICAO,
  PROVEDOR_PADRAO,
} from "@/lib/config";
import { codigoDoErro, fraseDoErro } from "@/lib/erros-banco";
import { registrarEvento } from "@/lib/eventos";
import { COOKIE_APARELHO, aparelhoValido } from "@/lib/familia/aparelho";
import { tokenValido } from "@/lib/links-formato";
import { limparTranscricao } from "@/lib/mensagens/limpar";
import { transcreverAudio } from "@/lib/mensagens/transcrever";
import type { AcoesMensagem, Upload } from "@/lib/mensagens/tipos";
import { envPipeline } from "@/lib/pipeline/env";
import { assinarUpload, baixar, conferirArquivo } from "@/lib/storage/upload";
import { clienteAdmin } from "@/lib/supabase/admin";

type Resultado<K extends keyof AcoesMensagem> = Awaited<
  ReturnType<AcoesMensagem[K]>
>;

const LINK_INVALIDO = {
  ok: false as const,
  mensagem: "Este link não vale mais. Sua mensagem não foi enviada.",
};
const RECARREGAR = {
  ok: false as const,
  mensagem: "Recarregue a página e tente de novo.",
};
const MB = 1024 * 1024;
const id = z.uuid();
const texto = z.string().trim().min(1).max(MAX_MENSAGEM_CARACTERES);

async function porta(token: string) {
  if (!tokenValido.safeParse(token).success) return null;
  const aparelho = (await cookies()).get(COOKIE_APARELHO)?.value;
  return aparelhoValido(aparelho) ? aparelho : undefined;
}

/** Erro do banco → frase. Link revogado ganha a frase do /m (não a do grupo da família). */
function frase(error: { message?: string } | null) {
  return codigoDoErro(error) === "link_invalido"
    ? LINK_INVALIDO.mensagem
    : fraseDoErro(error);
}

export async function criar(
  token: string,
  dados: Parameters<AcoesMensagem["criar"]>[0],
): Promise<Resultado<"criar">> {
  const aparelho = await porta(token);
  if (aparelho === null) return LINK_INVALIDO;
  if (!aparelho) return RECARREGAR;
  const nome = z.string().trim().min(1).max(80).safeParse(dados.nome);
  if (!nome.success) return { ok: false, mensagem: "Escreva seu nome." };
  const relacao = z.string().trim().min(1).max(60).safeParse(dados.relacao);
  if (!relacao.success)
    return { ok: false, mensagem: "Escreva quem você é para ele ou ela." };
  const tipo = dados.audio ? tipoDoAudio(dados.audio.mime) : null;
  if (dados.audio && !tipo)
    return {
      ok: false,
      mensagem:
        "Este celular gravou num formato que não aceitamos. Escreva a mensagem.",
    };

  const admin = clienteAdmin();
  const { data, error } = await admin.rpc("servico_mensagem_criar", {
    p_token: token,
    p_aparelho: aparelho,
    p_nome: nome.data,
    p_relacao: relacao.data,
    p_audio_tipo: tipo?.ext ?? null,
    p_foto: dados.foto === true,
    p_consentimento: dados.consentimento === true,
    p_consentimento_versao: CONSENTIMENTO_MENSAGEM_VERSAO,
  });
  if (error) return { ok: false, mensagem: frase(error) };
  const r = z
    .object({
      id: z.uuid(),
      livro: z.uuid(),
      audio_caminho: z.string().nullable(),
      foto_caminho: z.string().nullable(),
    })
    .safeParse(data);
  if (!r.success) return { ok: false, mensagem: fraseDoErro(null) };
  const m = r.data;

  // Assina só os caminhos que o banco fixou, conferidos de novo aqui.
  let audio: Upload | null = null;
  if (m.audio_caminho && tipo) {
    if (!arquivoDaMensagem(m.audio_caminho, m.livro, m.id, "audio"))
      return { ok: false, mensagem: fraseDoErro(null) };
    const a = await assinarUpload("mensagens", m.audio_caminho);
    if (!a) return { ok: false, mensagem: fraseDoErro(null) };
    audio = { ...a, contentType: tipo.contentType };
  }
  let foto: Upload | null = null;
  if (m.foto_caminho) {
    if (!arquivoDaMensagem(m.foto_caminho, m.livro, m.id, "foto"))
      return { ok: false, mensagem: fraseDoErro(null) };
    const f = await assinarUpload("mensagens", m.foto_caminho);
    if (!f) return { ok: false, mensagem: fraseDoErro(null) };
    foto = { ...f, contentType: "image/jpeg" };
  }
  return { ok: true, id: m.id, audio, foto };
}

/** O caminho de um arquivo ainda por chegar, conferido no banco (token, aparelho, 30 min). */
async function caminhoNoBanco(
  token: string,
  aparelho: string,
  mensagem: string,
  tipo: "audio" | "foto",
) {
  const { data } = await clienteAdmin().rpc("servico_caminho_mensagem", {
    p_token: token,
    p_aparelho: aparelho,
    p_id: mensagem,
    p_tipo: tipo,
  });
  const livro = data?.split("/")[1] ?? "";
  return data && arquivoDaMensagem(data, livro, mensagem, tipo) ? data : null;
}

export async function confirmarAudio(
  token: string,
  mensagem: string,
  duracaoS: number,
): Promise<Resultado<"confirmarAudio">> {
  const aparelho = await porta(token);
  if (aparelho === null) return { ...LINK_INVALIDO, regravar: false };
  if (!aparelho || !id.safeParse(mensagem).success)
    return { ...RECARREGAR, regravar: false };
  const caminho = await caminhoNoBanco(token, aparelho, mensagem, "audio");
  if (!caminho)
    return {
      ok: false,
      mensagem: "O tempo para enviar este áudio acabou. Grave de novo.",
      regravar: true,
    };
  const ext = caminho.split(".").pop() as "webm" | "m4a" | "ogg";
  const conferido = await conferirArquivo("mensagens", caminho, {
    maxBytes: MAX_MENSAGEM_AUDIO_MB * MB,
    tipo: ext,
  });
  if (conferido === "nao_chegou")
    return {
      ok: false,
      mensagem: "O áudio não chegou. Tente de novo.",
      regravar: false,
    };
  if (conferido !== "ok")
    return {
      ok: false,
      mensagem:
        conferido === "grande"
          ? "O áudio ficou grande demais. Grave um mais curto."
          : "Não conseguimos ler este áudio. Grave de novo.",
      regravar: true,
    };
  const segundos = Math.max(
    1,
    Math.min(MAX_MENSAGEM_AUDIO_MIN * 60 + 10, Math.round(duracaoS)),
  );
  const { data: ok, error } = await clienteAdmin().rpc(
    "servico_confirmar_audio_mensagem",
    {
      p_token: token,
      p_aparelho: aparelho,
      p_id: mensagem,
      p_duracao_s: segundos,
    },
  );
  if (error || !ok)
    return { ok: false, mensagem: frase(error), regravar: false };
  return { ok: true };
}

export async function confirmarFoto(
  token: string,
  mensagem: string,
): Promise<Resultado<"confirmarFoto">> {
  const aparelho = await porta(token);
  if (!aparelho || !id.safeParse(mensagem).success) return { ok: false };
  const caminho = await caminhoNoBanco(token, aparelho, mensagem, "foto");
  if (!caminho) return { ok: false };
  const conferido = await conferirArquivo("mensagens", caminho, {
    maxBytes: MAX_MENSAGEM_FOTO_MB * MB,
    tipo: "jpg",
  });
  if (conferido !== "ok") return { ok: false };
  const { data } = await clienteAdmin().rpc("servico_confirmar_foto_mensagem", {
    p_token: token,
    p_aparelho: aparelho,
    p_id: mensagem,
  });
  return { ok: data === true };
}

const reserva = z.union([
  z.object({ texto: z.string() }),
  z.object({ espera: z.literal(true) }),
  z.object({
    reserva: z.uuid(),
    caminho: z.string(),
    apelido: z.string().nullable(),
  }),
]);

export async function transcrever(
  token: string,
  mensagem: string,
): Promise<Resultado<"transcrever">> {
  const falha = (m: string, escrever = false, regravar = false) => ({
    ok: false as const,
    mensagem: m,
    escrever,
    regravar,
  });
  const aparelho = await porta(token);
  if (aparelho === null) return falha(LINK_INVALIDO.mensagem);
  if (!aparelho || !id.safeParse(mensagem).success)
    return falha(RECARREGAR.mensagem);

  const admin = clienteAdmin();
  const chamada = { p_token: token, p_aparelho: aparelho, p_id: mensagem };
  const { data, error } = await admin.rpc(
    "servico_mensagem_reservar_transcricao",
    chamada,
  );
  if (error) {
    const codigo = codigoDoErro(error);
    return falha(
      frase(error),
      codigo === "limite_transcricao",
      codigo === "audio_longo",
    );
  }
  const r = reserva.safeParse(data);
  if (!r.success) return falha(fraseDoErro(null));
  if ("texto" in r.data)
    return { ok: true, sugestao: limparTranscricao(r.data.texto) };
  if ("espera" in r.data) return { ok: false, espera: true };

  const { reserva: dono, caminho, apelido } = r.data;
  const livro = caminho.split("/")[1] ?? "";
  const soltar = () =>
    admin.rpc("servico_mensagem_transcricao_falhou", {
      ...chamada,
      p_reserva: dono,
    });
  const audio = arquivoDaMensagem(caminho, livro, mensagem, "audio")
    ? await baixar("mensagens", caminho)
    : null;
  const env = audio ? envPipeline() : null;
  const t =
    audio && env
      ? await transcreverAudio(audio, caminho.split("/").pop()!, apelido, {
          transcrever: TRANSCRITORES[PROVEDOR_PADRAO].transcrever,
          chave: env.ELEVENLABS_API_KEY,
          modelo: MODELOS_TRANSCRICAO[PROVEDOR_PADRAO],
        })
      : ({ ok: false } as const);
  if (!t.ok) {
    await soltar();
    return falha("Não conseguimos escrever o áudio agora. Tente de novo.");
  }

  const { data: gravou, error: e2 } = await admin.rpc(
    "servico_mensagem_transcrita",
    { ...chamada, p_reserva: dono, p_texto: t.bruto, p_fim_s: t.fimS },
  );
  if (e2) return falha(frase(e2));
  if (gravou === "audio_longo")
    return falha(fraseDoErro({ message: "audio_longo" }), false, true);
  if (gravou === "ok")
    return { ok: true, sugestao: limparTranscricao(t.bruto) };
  // Outra chamada gravou antes (ja_havia) ou a reserva venceu: a próxima reserva devolve o texto.
  return { ok: false, espera: true };
}

export async function enviar(
  token: string,
  mensagem: string,
  textoDaPessoa: string,
): Promise<Resultado<"enviar">> {
  const aparelho = await porta(token);
  if (aparelho === null) return LINK_INVALIDO;
  if (!aparelho || !id.safeParse(mensagem).success) return RECARREGAR;
  const t = texto.safeParse(textoDaPessoa);
  if (!t.success)
    return {
      ok: false,
      mensagem: textoDaPessoa.trim()
        ? "A mensagem ficou longa demais. Encurte um pouco."
        : "Escreva a mensagem antes.",
    };
  const { data, error } = await clienteAdmin().rpc("servico_mensagem_enviar", {
    p_token: token,
    p_aparelho: aparelho,
    p_id: mensagem,
    p_texto: t.data,
  });
  if (error) return { ok: false, mensagem: frase(error) };
  const r = z
    .object({
      livro: z.uuid(),
      audio: z.boolean(),
      foto: z.boolean(),
      transcricao: z.string().nullable(),
    })
    .safeParse(data);
  if (r.success) {
    const { livro, audio, foto, transcricao } = r.data;
    const alterou =
      transcricao !== null && limparTranscricao(transcricao) !== t.data;
    after(() =>
      registrarEvento({
        quem: null,
        papel: "familia",
        acao: "deixou_mensagem",
        livro,
        detalhes: { mensagem, audio, foto, alterou },
      }),
    );
  }
  return { ok: true };
}
