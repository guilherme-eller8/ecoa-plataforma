"use server";

// Ações do link do autor (sem login, prompt 5). O token vem do caminho; o banco confere tudo
// de novo (funções autor_* com dono porta_autor, T29). A chave secreta só assina o upload de
// uma gravação que a porta do autor acabou de criar e confirma que o arquivo chegou inteiro.

import { dispararSeRecebida } from "@/lib/pipeline/disparo";
import { after } from "next/server";
import { z } from "zod";
import {
  esquemaPreparoDoAutor,
  type GravacaoParaPreparar,
} from "@/lib/autor/tipos";
import { CONSENTIMENTO_AUTOR_VERSAO } from "@/lib/config";
import { fraseDoErro } from "@/lib/erros-banco";
import { registrarEvento } from "@/lib/eventos";
import type { CodigoEnvio, Preparo, RespostaEnvio } from "@/lib/gravacao/envio";
import { hashDoToken } from "@/lib/links";
import { tokenValido } from "@/lib/links-formato";
import type { AudioPreparado } from "@/lib/livro/tipos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteAnonimo } from "@/lib/supabase/anonimo";

const LINK_INVALIDO = {
  ok: false as const,
  mensagem:
    "Este link não vale mais. Peça um novo a quem está fazendo o seu livro.",
  codigo: "link_invalido" as const,
};
const DE_NOVO = {
  ok: false as const,
  mensagem: "Não deu certo agora. Tente de novo.",
};

const CODIGOS: Record<string, CodigoEnvio> = {
  link_invalido: "link_invalido",
  gravacao_expirada: "expirada",
  limite_gravacoes: "limite",
};

function falhaDoBanco(error: { message?: string } | null) {
  const codigo = Object.keys(CODIGOS).find((c) => error?.message?.includes(c));
  if (codigo === "link_invalido") return LINK_INVALIDO;
  return {
    ok: false as const,
    mensagem: fraseDoErro(error),
    ...(codigo ? { codigo: CODIGOS[codigo] } : {}),
  };
}

const CONTENT_TYPE = { webm: "audio/webm", m4a: "audio/mp4" } as const;

/** A gravação do livro deste token, lida com a chave secreta (só para decidir o próximo passo). */
async function gravacaoDoToken(token: string, id: string) {
  const admin = clienteAdmin();
  const { data: r } = await admin
    .from("recordings")
    .select(
      "id, book_id, caminho, content_type, tamanho_bytes, upload, criado_em, author_access_id, prompt_id, origem, lote_id, processado_em",
    )
    .eq("id", id)
    .not("author_access_id", "is", null)
    .maybeSingle();
  if (!r?.author_access_id) return null;
  const { data: a } = await admin
    .from("author_access")
    .select("book_id, token_hash, revogado_em")
    .eq("id", r.author_access_id)
    .maybeSingle();
  // O token precisa ser o do link ativo do mesmo livro (o link trocado não alcança mais nada).
  if (!a || a.book_id !== r.book_id || a.revogado_em) return null;
  const { data: ativo } = await admin
    .from("author_access")
    .select("id")
    .eq("book_id", r.book_id)
    .eq("token_hash", hashDoToken(token))
    .is("revogado_em", null)
    .maybeSingle();
  return ativo ? r : null;
}

async function assinarCaminho(
  id: string,
  caminho: string,
  contentType: string,
): Promise<AudioPreparado | null> {
  const { data } = await clienteAdmin()
    .storage.from("audios")
    .createSignedUploadUrl(caminho, { upsert: true });
  return data ? { id, caminho, token: data.token, contentType } : null;
}

export async function consentir(token: string) {
  if (!tokenValido.safeParse(token).success) return LINK_INVALIDO;
  const { data, error } = await clienteAnonimo().rpc("autor_consentir", {
    p_token: token,
    p_versao: CONSENTIMENTO_AUTOR_VERSAO,
  });
  if (error || !data) return LINK_INVALIDO;
  after(async () => {
    const { data: a } = await clienteAdmin()
      .from("author_access")
      .select("book_id")
      .eq("token_hash", hashDoToken(token))
      .is("revogado_em", null)
      .maybeSingle();
    if (a)
      await registrarEvento({
        quem: null,
        papel: "autor",
        acao: "autor_consentiu",
        livro: a.book_id,
      });
  });
  return { ok: true as const };
}

const esquemaGravacao = z.object({
  id: z.uuid(),
  promptId: z.uuid().nullable(),
  ext: z.enum(["webm", "m4a"]),
  tamanho: z.number().int().min(1),
  duracaoS: z.number().min(0),
});

export async function prepararGravacao(
  token: string,
  g: GravacaoParaPreparar,
): Promise<RespostaEnvio<Preparo>> {
  if (!tokenValido.safeParse(token).success) return LINK_INVALIDO;
  const v = esquemaGravacao.safeParse(g);
  if (!v.success) return DE_NOVO;
  const { data, error } = await clienteAnonimo().rpc(
    "autor_preparar_gravacao",
    {
      p_token: token,
      p_id: v.data.id,
      p_prompt: v.data.promptId,
      p_ext: v.data.ext,
      p_tamanho_bytes: v.data.tamanho,
      p_duracao_s: Math.max(1, Math.round(v.data.duracaoS)),
    },
  );
  if (error) return falhaDoBanco(error);
  const p = esquemaPreparoDoAutor.safeParse(data);
  if (!p.success) return DE_NOVO;
  const contentType = CONTENT_TYPE[v.data.ext];
  if (p.data.recebida)
    return {
      ok: true,
      dados: {
        id: p.data.id,
        caminho: p.data.caminho,
        contentType,
        token: null,
        recebida: true,
      },
    };
  const assinado = await assinarCaminho(p.data.id, p.data.caminho, contentType);
  if (!assinado) return DE_NOVO;
  return { ok: true, dados: { ...assinado, recebida: false } };
}

/** Token novo para retomar um envio que parou (o token de upload vale 2 h). */
export async function assinarGravacao(
  token: string,
  id: string,
): Promise<RespostaEnvio<AudioPreparado>> {
  if (!tokenValido.safeParse(token).success) return LINK_INVALIDO;
  if (!z.uuid().safeParse(id).success) return DE_NOVO;
  const { data: caminho } = await clienteAdmin().rpc(
    "servico_caminho_gravacao_autor",
    {
      p_token: token,
      p_id: id,
    },
  );
  if (caminho) {
    const tipo = caminho.endsWith(".m4a") ? "audio/mp4" : "audio/webm";
    const a = await assinarCaminho(id, caminho, tipo);
    return a ? { ok: true, dados: a } : DE_NOVO;
  }
  // Sem caminho: ou já chegou, ou venceu, ou o link foi trocado.
  const r = await gravacaoDoToken(token, id);
  if (!r) return LINK_INVALIDO;
  if (r.upload === "recebido")
    return { ok: false, mensagem: "Já chegou.", codigo: "recebida" };
  return {
    ok: false,
    mensagem: "Esta gravação precisa ser enviada de novo.",
    codigo: "expirada",
  };
}

export async function confirmarGravacao(
  token: string,
  id: string,
): Promise<RespostaEnvio> {
  if (!tokenValido.safeParse(token).success) return LINK_INVALIDO;
  if (!z.uuid().safeParse(id).success) return DE_NOVO;
  const r = await gravacaoDoToken(token, id);
  if (!r) return LINK_INVALIDO;
  if (r.upload === "recebido") {
    after(() => dispararSeRecebida(r));
    return { ok: true };
  }

  const admin = clienteAdmin();
  const { data: info } = await admin.storage.from("audios").info(r.caminho);
  if (!info || Number(info.size) !== r.tamanho_bytes)
    return {
      ok: false,
      mensagem: "O áudio não chegou inteiro. Tente de novo.",
    };
  const { data: ok, error } = await admin.rpc(
    "servico_confirmar_gravacao_autor",
    {
      p_token: token,
      p_id: id,
      p_tamanho_bytes: r.tamanho_bytes,
    },
  );
  if (error || !ok) return DE_NOVO;
  after(() =>
    registrarEvento({
      quem: null,
      papel: "autor",
      acao: "gravou",
      livro: r.book_id,
      detalhes: {
        recording: r.id,
        origem: r.origem,
        com_pergunta: Boolean(r.prompt_id),
      },
    }),
  );
  after(() => dispararSeRecebida(r));
  return { ok: true };
}
