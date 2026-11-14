"use server";

// Compartilhar no grupo (prompt 11, P61, design 4.3). Qualquer membro; 1 link por história
// marcada como pronta. A voz é o recorte do QR (T45): compartilhar cria o QR se faltar; sem
// voz possível, compartilha só o texto.
import { after } from "next/server";
import { z } from "zod";
import type { LinkCompartilhado } from "@/lib/compartilhar/tipos";
import { envLinks } from "@/lib/env-links";
import { codigoDoErro, fraseDoErro } from "@/lib/erros-banco";
import { registrarEvento } from "@/lib/eventos";
import type { Acao } from "@/lib/eventos-acoes";
import {
  hashDoToken,
  tokenDoLink,
  urlCompartilhada,
} from "@/lib/links";
import {
  livroDaAcao,
  nomeDoAutor,
  type LivroComAcesso,
} from "@/lib/livro/acesso";
import type { Resposta } from "@/lib/livro/tipos";
import { codigoValido } from "@/lib/qr/codigo";
import { pedirRecorte } from "@/lib/qr/player";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";
import { mensagemCompartilhar } from "@/lib/whatsapp";

const uuid = z.uuid();
const ERRO = {
  ok: false as const,
  mensagem: "Não deu certo agora. Tente de novo.",
};
const SEM_ACESSO = {
  ok: false as const,
  mensagem: "Você não tem acesso a este livro.",
};
// A história não pode ter voz: compartilha só o texto.
const SEM_VOZ = new Set([
  "historia_sem_audio",
  "historia_audio_compartilhado",
  "qr_desativado",
]);

function evento(
  a: LivroComAcesso,
  acao: Acao,
  detalhes: Record<string, string>,
) {
  after(() =>
    registrarEvento({
      quem: a.usuario.id,
      papel: a.livro.papel,
      acao,
      livro: a.livro.id,
      detalhes,
    }),
  );
}

/** Garante o QR (a voz) e diz se a mensagem pode falar em voz. */
async function garantirVoz(
  a: LivroComAcesso,
  historiaId: string,
): Promise<boolean> {
  const supabase = await clienteSessao();
  const { data: antes } = await supabase
    .from("qr_codes")
    .select("codigo")
    .eq("book_id", a.livro.id)
    .eq("story_id", historiaId)
    .maybeSingle();
  const { data, error } = await supabase.rpc("criar_qr", {
    p_story: historiaId,
  });
  if (error) {
    if (!SEM_VOZ.has(codigoDoErro(error) ?? ""))
      console.warn("[compartilhar] QR não criado", { story: historiaId });
    return false;
  }
  const r = data?.[0];
  if (!r || !codigoValido(r.codigo)) return false;
  if (!antes)
    evento(a, "qr_criado", { story: historiaId }); // como a amostra (prompt 10)
  if (r.pedir_audio) await pedirRecorte(r.codigo);
  return true;
}

export async function compartilhar(
  livroId: string,
  historiaId: string,
): Promise<Resposta<LinkCompartilhado>> {
  if (!uuid.safeParse(historiaId).success) return ERRO;
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;

  const supabase = await clienteSessao();
  const { data: historia } = await supabase
    .from("stories")
    .select("id, titulo")
    .eq("book_id", a.livro.id)
    .eq("id", historiaId)
    .maybeSingle();
  if (!historia) return ERRO;

  const comVoz = await garantirVoz(a, historiaId);

  const env = envLinks();
  const novoId = crypto.randomUUID();
  const novoToken = tokenDoLink("compartilhar", novoId, env.versaoAtual, env);
  const { data, error } = await clienteAdmin().rpc(
    "servico_compartilhar_historia",
    {
      p_story: historiaId,
      p_usuario: a.usuario.id,
      p_id: novoId,
      p_token_hash: hashDoToken(novoToken),
      p_chave_versao: env.versaoAtual,
    },
  );
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  const link = data?.[0];
  if (!link) return ERRO;
  if (link.criado) evento(a, "compartilhou_historia", { story_id: historiaId });

  const url = urlCompartilhada(
    tokenDoLink("compartilhar", link.id, link.chave_versao, env),
  );
  return {
    ok: true,
    dados: {
      url,
      comVoz,
      mensagem: mensagemCompartilhar({
        autor: nomeDoAutor(a.livro),
        titulo: historia.titulo?.trim() || "Uma história",
        parentesco: a.livro.autor_parentesco,
        comVoz,
        link: url,
      }),
    },
  };
}

/** Desligar o link: qualquer membro, vale com o plano vencido (ação de segurança). */
export async function desligarCompartilhamento(
  livroId: string,
  historiaId: string,
): Promise<Resposta> {
  if (!uuid.safeParse(historiaId).success) return ERRO;
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  const supabase = await clienteSessao();
  const { data, error } = await supabase.rpc("revogar_compartilhamento", {
    p_story: historiaId,
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  if (data) evento(a, "compartilhada_desligada", { story_id: historiaId });
  return { ok: true };
}
