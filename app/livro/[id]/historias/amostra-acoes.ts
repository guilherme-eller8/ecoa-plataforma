"use server";

// Folha "Página de amostra" (prompt 10, seção 5.1). criar_qr confere membro, plano, história
// pronta e sorteia o código no banco; aqui só o formato, o evento e o pedido do recorte.
import { after } from "next/server";
import type { EstadoAmostra } from "@/components/editor/folha-amostra";
import { z } from "zod";
import { codigoDoErro, fraseDoErro } from "@/lib/erros-banco";
import { registrarEvento } from "@/lib/eventos";
import type { Acao } from "@/lib/eventos-acoes";
import { AMOSTRA_PREVIA_DPI } from "@/lib/config";
import { livroDaAcao, type LivroComAcesso } from "@/lib/livro/acesso";
import {
  dadosDaAmostra,
  gerarAmostraDaHistoria,
} from "@/lib/livro/dados-amostra";
import { rasterizarPaginas } from "@/lib/livro/pdf";
import type { Resposta } from "@/lib/livro/tipos";
import { codigoValido } from "@/lib/qr/codigo";
import { pedirRecorte } from "@/lib/qr/player";
import { clienteSessao } from "@/lib/supabase/servidor";

const uuid = z.uuid();
const ERRO = {
  ok: false as const,
  mensagem: "Não deu certo agora. Tente de novo.",
};
const SEM_ACESSO = {
  ok: false as const,
  mensagem: "Você não tem acesso a este livro.",
};

function evento(a: LivroComAcesso, acao: Acao, historia: string) {
  after(() =>
    registrarEvento({
      quem: a.usuario.id,
      papel: a.livro.papel,
      acao,
      livro: a.livro.id,
      detalhes: { story: historia },
    }),
  );
}

async function qrAtual(livro: string, historia: string) {
  const supabase = await clienteSessao();
  const { data } = await supabase
    .from("qr_codes")
    .select("codigo, desativado_em")
    .eq("book_id", livro)
    .eq("story_id", historia)
    .maybeSingle();
  return data;
}

/** Cria o QR (ou devolve o que já existe) e pede o recorte da voz se precisar. Idempotente. */
export async function prepararAmostra(
  livroId: string,
  historiaId: string,
): Promise<Resposta<EstadoAmostra>> {
  if (!uuid.safeParse(historiaId).success) return ERRO;
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  const responsavel = a.livro.papel === "responsavel";
  const antes = await qrAtual(a.livro.id, historiaId);
  const supabase = await clienteSessao();
  const { data, error } = await supabase.rpc("criar_qr", {
    p_story: historiaId,
  });
  if (error) {
    if (codigoDoErro(error) === "qr_desativado" && antes)
      return {
        ok: true,
        dados: {
          codigo: antes.codigo,
          vozPronta: false,
          desligado: true,
          responsavel,
          envioFalhou: false,
        },
      };
    return { ok: false, mensagem: fraseDoErro(error) };
  }
  const r = data?.[0];
  if (!r || !codigoValido(r.codigo)) return ERRO;
  if (!antes) evento(a, "qr_criado", historiaId);
  // A fila recusou: a folha diz na hora, em vez de esperar 2 min por uma voz que não vem.
  const envioFalhou = r.pedir_audio ? !(await pedirRecorte(r.codigo)) : false;
  return {
    ok: true,
    dados: {
      codigo: r.codigo,
      vozPronta: r.audio_pronto,
      desligado: false,
      responsavel,
      envioFalhou,
    },
  };
}

/**
 * A página de amostra na tela (JPEG), antes da voz ficar pronta: a pessoa vê o resultado na hora.
 * O PDF continua só com a voz pronta (P56). Na imagem o QR sai tracejado, para ninguém escanear
 * da tela um código que ainda não toca.
 */
export async function previaAmostra(
  livroId: string,
  historiaId: string,
): Promise<Resposta<{ imagem: string; cortada: boolean }>> {
  if (!uuid.safeParse(historiaId).success) return ERRO;
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  const d = await dadosDaAmostra(a.livro.id, historiaId);
  if (!d)
    return {
      ok: false,
      mensagem: "Marque a história como pronta para ver a página.",
    };
  if (!d.codigo) return ERRO;
  try {
    const r = await gerarAmostraDaHistoria({ ...d, codigo: d.codigo });
    const cobrir = d.vozPronta && !d.desligado ? [] : [r.marca];
    const [jpeg] = await rasterizarPaginas(
      r.pdf,
      1,
      1,
      AMOSTRA_PREVIA_DPI,
      cobrir,
    );
    if (!jpeg) return ERRO;
    return {
      ok: true,
      dados: {
        imagem: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
        cortada: r.cortado,
      },
    };
  } catch {
    return ERRO;
  }
}

/** Só o responsável (o banco confere de novo). Vale com o plano vencido. */
export async function desligarQr(
  livroId: string,
  historiaId: string,
  desligar: boolean,
): Promise<Resposta> {
  if (!uuid.safeParse(historiaId).success) return ERRO;
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  const qr = await qrAtual(a.livro.id, historiaId);
  if (!qr) return ERRO;
  const supabase = await clienteSessao();
  const { error } = await supabase.rpc("desativar_qr", {
    p_codigo: qr.codigo,
    p_desligar: desligar,
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  evento(a, desligar ? "qr_desligado" : "qr_religado", historiaId);
  return { ok: true };
}
