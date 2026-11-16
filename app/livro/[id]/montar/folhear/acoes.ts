"use server";

// Folhear o livro antes de publicar (P72). Qualquer membro (como a montagem, P67). O conteúdo vem
// pela sessão (montagem_conteudo, RLS); a chave secreta só baixa as fotos depois que
// conferirCaminhos confirmou que cada caminho é deste livro. Montar de novo gasta a mesma cota da
// contagem de páginas (30 por minuto no banco); reaproveitar o que está em memória não gasta.
import { after } from "next/server";
import { z } from "zod";
import { FOLHEAR_PAGINAS_POR_PEDIDO } from "@/lib/config";
import { registrarEvento } from "@/lib/eventos";
import { livroDaAcao } from "@/lib/livro/acesso";
import { ErroLivro } from "@/lib/livro/erros";
import {
  folheioDoLivro,
  folheioGuardado,
  paginasDoFolheio,
  type ToqueNaFoto,
} from "@/lib/livro/folhear";
import { fotosDaHistoria } from "@/lib/historias/dados";
import type { FotoDaHistoria } from "@/lib/historias/tipos";
import { soIncluidas } from "@/lib/livro/montagem";
import { lerMontagem } from "@/lib/livro/montar-servidor";
import type { Resposta } from "@/lib/livro/tipos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";

export type PaginasDoFolheio = {
  hash: string;
  /** Páginas do miolo (0 = nenhuma história pronta entra no livro ainda). */
  total: number;
  /** A capa aberta, só no pedido que começa na página 1. */
  capa: string | null;
  de: number;
  urls: string[];
  /** Alguma história vai ganhar o QR só ao publicar (o quadrado tracejado). */
  provisorio: boolean;
  /** P76: as fotos do livro inteiro, em % da página, para tocar e ajustar. */
  toques: ToqueNaFoto[];
};

const SEM_ACESSO = {
  ok: false as const,
  mensagem: "Você não tem acesso a este livro.",
};
const AGUARDE = {
  ok: false as const,
  mensagem: "Muitas prévias agora. Espere um instante e tente de novo.",
};
const GENERICO = {
  ok: false as const,
  mensagem: "Não deu para montar a prévia agora. Tente de novo.",
};

const Pagina = z.number().int().min(1).max(2000);

export async function folhear(
  livroId: string,
  de: number,
): Promise<Resposta<PaginasDoFolheio>> {
  if (!Pagina.safeParse(de).success) return GENERICO;
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  const lida = await lerMontagem(a.livro.id);
  if (!lida) return GENERICO;
  if (soIncluidas(lida.conteudo).historias.length === 0)
    return {
      ok: true,
      dados: {
        hash: lida.hash,
        total: 0,
        capa: null,
        de,
        urls: [],
        provisorio: false,
        toques: [],
      },
    };

  if (!folheioGuardado(a.livro.id, lida.hash)) {
    const db = await clienteSessao();
    const { data, error } = await db.rpc("montagem_reservar_uso", {
      p_book: a.livro.id,
    });
    if (error) return GENERICO;
    if (!data) return AGUARDE;
  }

  const admin = clienteAdmin();
  try {
    const f = await folheioDoLivro(
      a.livro.id,
      lida.conteudo,
      lida.hash,
      async (bucket, caminho) => {
        const r = await admin.storage.from(bucket).download(caminho);
        if (r.error || !r.data) throw new ErroLivro("falhou_foto");
        return Buffer.from(await r.data.arrayBuffer());
      },
    );
    const ate = de + FOLHEAR_PAGINAS_POR_PEDIDO - 1;
    const urls = await paginasDoFolheio(f, de, ate);
    if (de === 1)
      after(() =>
        registrarEvento({
          quem: a.usuario.id,
          papel: a.livro.papel,
          acao: "livro_folheado",
          livro: a.livro.id,
          detalhes: { paginas: f.paginas, historias: f.historias },
        }),
      );
    return {
      ok: true,
      dados: {
        hash: lida.hash,
        total: f.paginas,
        capa: de === 1 ? f.capa : null,
        de,
        urls,
        provisorio: f.cobrir.length > 0,
        // Todas as fotos do livro (poucos números): a dica e o toque valem antes da página chegar.
        toques: f.toques,
      },
    };
  } catch {
    return GENERICO;
  }
}

/**
 * P76: a foto tocada no Folhear (pela posição na história), com a URL assinada, para abrir "Ajustar a foto". Pela sessão
 * (RLS de membro); salvar usa a mesma ação do editor (ajustarFoto).
 */
export async function fotoParaAjustar(
  livroId: string,
  historiaId: string,
  indice: number,
): Promise<Resposta<{ foto: FotoDaHistoria; primeira: boolean }>> {
  const uuid = z.uuid();
  if (
    !uuid.safeParse(historiaId).success ||
    !z.number().int().min(0).max(10).safeParse(indice).success
  )
    return GENERICO;
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  const fotos = await fotosDaHistoria(a.livro.id, historiaId);
  const foto = fotos[indice];
  if (!foto)
    return {
      ok: false,
      mensagem: "Não achamos esta foto. Atualize a página e tente de novo.",
    };
  return { ok: true, dados: { foto, primeira: indice === 0 } };
}
