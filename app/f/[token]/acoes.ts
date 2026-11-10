"use server";

// Ações do link da família (sem login). O token vem do caminho; o banco confere tudo de novo.
// As 3 portas familia_* são chamadas com o cliente anônimo. A chave secreta só assina o
// upload do áudio de um causo que o banco acabou de criar e confirma que o arquivo chegou.

import { cookies } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { audioDoCauso, tipoDoAudio } from "@/lib/arquivos";
import { CONSENTIMENTO_CAUSO_VERSAO, MAX_CAUSO_AUDIO_MB } from "@/lib/config";
import { fraseDoErro } from "@/lib/erros-banco";
import { registrarEvento } from "@/lib/eventos";
import { COOKIE_APARELHO, aparelhoValido } from "@/lib/familia/aparelho";
import { clienteAdmin } from "@/lib/supabase/admin";
import { tokenValido } from "@/lib/links-formato";
import { clienteAnonimo } from "@/lib/supabase/anonimo";

const LINK_INVALIDO = {
  ok: false as const,
  mensagem: "Este link não vale mais. Peça o novo no grupo.",
};
const nome = z.string().trim().min(1, "Escreva seu nome.").max(80);

export async function votar(
  token: string,
  nomeDeQuemVota: string,
  itens: string[],
) {
  if (!tokenValido.safeParse(token).success) return LINK_INVALIDO;
  const n = nome.safeParse(nomeDeQuemVota);
  if (!n.success) return { ok: false as const, mensagem: "Escreva seu nome." };
  if (!z.array(z.uuid()).min(1).max(30).safeParse(itens).success)
    return { ok: false as const, mensagem: "Escolha pelo menos uma." };
  const aparelho = (await cookies()).get(COOKIE_APARELHO)?.value;
  if (!aparelhoValido(aparelho))
    return {
      ok: false as const,
      mensagem: "Recarregue a página e tente de novo.",
    };

  const { data, error } = await clienteAnonimo().rpc("familia_votar", {
    p_token: token,
    p_aparelho: aparelho,
    p_nome: n.data,
    p_itens: itens,
  });
  if (error) return { ok: false as const, mensagem: fraseDoErro(error) };
  const r = z.object({ livro: z.uuid(), votante: z.uuid() }).safeParse(data);
  if (r.success)
    after(() =>
      registrarEvento({
        quem: null,
        papel: "familia",
        acao: "votou",
        livro: r.data.livro,
        detalhes: { votante: r.data.votante },
      }),
    );
  return { ok: true as const };
}

async function assinarUpload(
  token: string,
  causo: string,
  livro: string,
  mime: string,
) {
  const tipo = tipoDoAudio(mime);
  if (!tipo) return null;
  const admin = clienteAdmin();
  const { data: caminho } = await admin.rpc("servico_caminho_audio_causo", {
    p_token: token,
    p_causo: causo,
  });
  if (!caminho || !audioDoCauso(caminho, livro, causo)) return null;
  const { data } = await admin.storage
    .from("causos")
    .createSignedUploadUrl(caminho);
  if (!data) return null;
  return { caminho, token: data.token, contentType: tipo.contentType };
}

export async function enviarCauso(
  token: string,
  dados: {
    tipo: "pergunta" | "causo";
    nome: string;
    texto: string | null;
    audio: { mime: string } | null;
    consentimento: boolean;
  },
) {
  if (!tokenValido.safeParse(token).success) return LINK_INVALIDO;
  const n = nome.safeParse(dados.nome);
  if (!n.success) return { ok: false as const, mensagem: "Escreva seu nome." };
  const tipo = dados.audio ? tipoDoAudio(dados.audio.mime) : null;
  if (dados.audio && !tipo)
    return {
      ok: false as const,
      mensagem:
        "Este celular gravou num formato que não aceitamos. Escreva o causo.",
    };

  const { data, error } = await clienteAnonimo().rpc("familia_enviar_causo", {
    p_token: token,
    p_nome: n.data,
    p_texto: dados.audio ? null : (dados.texto ?? "").trim().slice(0, 2000),
    p_audio_tipo: tipo?.ext ?? null,
    p_consentimento: dados.consentimento === true,
    p_consentimento_versao: CONSENTIMENTO_CAUSO_VERSAO,
    p_tipo: dados.tipo === "pergunta" ? "pergunta" : "causo",
  });
  if (error) return { ok: false as const, mensagem: fraseDoErro(error) };
  const r = z.object({ id: z.uuid(), livro: z.uuid() }).safeParse(data);
  if (!r.success) return { ok: false as const, mensagem: fraseDoErro(null) };
  after(() =>
    registrarEvento({
      quem: null,
      papel: "familia",
      acao: "sugeriu",
      livro: r.data.livro,
      detalhes: { causo: r.data.id },
    }),
  );
  if (!dados.audio)
    return { ok: true as const, causo: r.data.id, upload: null };
  const upload = await assinarUpload(
    token,
    r.data.id,
    r.data.livro,
    dados.audio.mime,
  );
  if (!upload) return { ok: false as const, mensagem: fraseDoErro(null) };
  return { ok: true as const, causo: r.data.id, upload };
}

/** Pede de novo a autorização de upload (só se o arquivo ainda não chegou). */
export async function prepararAudioDeNovo(
  token: string,
  causo: string,
  mime: string,
) {
  if (
    !tokenValido.safeParse(token).success ||
    !z.uuid().safeParse(causo).success
  )
    return LINK_INVALIDO;
  const admin = clienteAdmin();
  const { data: caminho } = await admin.rpc("servico_caminho_audio_causo", {
    p_token: token,
    p_causo: causo,
  });
  const livro = caminho?.split("/")[1] ?? "";
  if (!caminho)
    return {
      ok: false as const,
      mensagem: "O tempo para enviar este áudio acabou. Grave de novo.",
    };
  const { data: existe } = await admin.storage.from("causos").exists(caminho);
  if (existe) return { ok: false as const, mensagem: "O áudio já chegou." };
  const upload = await assinarUpload(token, causo, livro, mime);
  if (!upload) return { ok: false as const, mensagem: fraseDoErro(null) };
  return { ok: true as const, upload };
}

/** Confere que o arquivo chegou (e o tamanho) e só então mostra o causo ao responsável. */
export async function confirmarAudio(
  token: string,
  causo: string,
  duracaoS: number,
) {
  if (
    !tokenValido.safeParse(token).success ||
    !z.uuid().safeParse(causo).success
  )
    return { ...LINK_INVALIDO, podeTentarDeNovo: false };
  const duracao = Math.max(1, Math.min(190, Math.round(duracaoS)));
  const admin = clienteAdmin();
  const { data: caminho } = await admin.rpc("servico_caminho_audio_causo", {
    p_token: token,
    p_causo: causo,
  });
  if (!caminho)
    return {
      ok: false as const,
      mensagem: "O tempo para enviar este áudio acabou. Grave de novo.",
      podeTentarDeNovo: false,
    };
  const { data: info } = await admin.storage.from("causos").info(caminho);
  if (!info)
    return {
      ok: false as const,
      mensagem: "O áudio não chegou. Tente de novo.",
      podeTentarDeNovo: true,
    };
  if ((info.size ?? 0) > MAX_CAUSO_AUDIO_MB * 1024 * 1024) {
    await admin.storage.from("causos").remove([caminho]);
    return {
      ok: false as const,
      mensagem: "O áudio ficou grande demais. Grave um mais curto.",
      podeTentarDeNovo: false,
    };
  }
  const { data: ok, error } = await admin.rpc("servico_confirmar_audio_causo", {
    p_token: token,
    p_causo: causo,
    p_duracao_s: duracao,
  });
  if (error || !ok)
    return {
      ok: false as const,
      mensagem: fraseDoErro(error),
      podeTentarDeNovo: true,
    };
  return { ok: true as const };
}
