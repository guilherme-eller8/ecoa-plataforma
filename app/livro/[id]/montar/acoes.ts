"use server";

// Ações da montagem do livro (prompt 13). Tudo pelo cliente da sessão: as funções montagem_* e
// publicar_livro conferem membro, plano e responsável no banco. Eventos só com ids e números.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import {
  CAPA_CORES,
  DEDICATORIA_MAX,
  MAX_ITENS_LIVRO,
  SUBTITULO_LIVRO_MAX,
  TITULO_LIVRO_MAX,
} from "@/lib/config";
import { fotoDoLivro } from "@/lib/arquivos";
import { fraseDoErro } from "@/lib/erros-banco";
import { registrarEvento } from "@/lib/eventos";
import { inngest } from "@/lib/inngest/cliente";
import { livroDaAcao } from "@/lib/livro/acesso";
import {
  contarDoConteudo,
  miniaturaDaFoto,
  previaDaCapa,
} from "@/lib/livro/contar";
import { EVENTO_LIVRO_EXPORTAR } from "@/lib/livro/eventos";
import { lerMontagem } from "@/lib/livro/montar-servidor";
import type { ContagemDoLivro } from "@/lib/livro/montar-tipos";
import type { Resposta } from "@/lib/livro/tipos";
import { pedirRecorte } from "@/lib/qr/player";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/servidor";
import { noLivro } from "../mensagens/acoes";

const SEM_ACESSO = {
  ok: false as const,
  mensagem: "Você não tem acesso a este livro.",
};
const FECHADO = {
  ok: false as const,
  mensagem: "Este livro não aceita mudanças agora.",
};
const AGUARDE = {
  ok: false as const,
  mensagem: "Muitas mudanças agora. Espere um instante e tente de novo.",
};
const GENERICO = {
  ok: false as const,
  mensagem: "Não deu certo agora. Tente de novo.",
};

const uuid = z.uuid();
const Entrada = z.object({
  rev: z.number().int().min(0),
  titulo: z.string().max(TITULO_LIVRO_MAX * 2),
  subtitulo: z.string().max(SUBTITULO_LIVRO_MAX * 2),
  dedicatoria: z.string().max(DEDICATORIA_MAX * 2),
  capaFotoId: uuid.nullable(),
  capaCor: z.enum(Object.keys(CAPA_CORES) as [string, ...string[]]),
  capaFocoX: z.number().int().min(0).max(100),
  capaFocoY: z.number().int().min(0).max(100),
  ordemHistorias: z.array(uuid).max(MAX_ITENS_LIVRO),
  ordemMensagens: z.array(uuid).max(MAX_ITENS_LIVRO),
  fora: z.array(uuid).max(MAX_ITENS_LIVRO),
});

/** Salva a montagem inteira com a revisão que a tela leu; outra pessoa salvou antes = montagem_mudou. */
export async function salvarMontagem(
  livroId: string,
  entrada: unknown,
): Promise<Resposta<{ rev: number }>> {
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  if (!a.podeEscrever) return FECHADO;
  const e = Entrada.safeParse(entrada);
  if (!e.success)
    return {
      ok: false,
      mensagem: "Algo não está certo. Confira e tente de novo.",
    };
  const d = e.data;
  const db = await clienteSessao();
  const { data, error } = await db.rpc("montagem_salvar", {
    p_book: a.livro.id,
    p_rev: d.rev,
    p_titulo: d.titulo.trim() || null,
    p_subtitulo: d.subtitulo.trim() || null,
    p_dedicatoria: d.dedicatoria.trim() || null,
    p_capa_foto: d.capaFotoId,
    p_capa_cor: d.capaCor,
    p_ordem_historias: d.ordemHistorias,
    p_ordem_mensagens: d.ordemMensagens,
    p_fora: d.fora,
    p_capa_foco_x: d.capaFocoX,
    p_capa_foco_y: d.capaFocoY,
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  after(() =>
    registrarEvento({
      quem: a.usuario.id,
      papel: a.livro.papel,
      acao: "montou_livro",
      livro: a.livro.id,
      detalhes: { rev: data },
    }),
  );
  return { ok: true, dados: { rev: data } };
}

/** Riscar mensagem é o mesmo "entra no livro" da aba Mensagens (Q8, P65): uma regra só. */
export async function mensagemNoLivro(
  livroId: string,
  id: string,
  incluir: boolean,
): Promise<Resposta> {
  const r = await noLivro(livroId, id, incluir);
  if (r.ok) revalidatePath(`/livro/${livroId}/montar`);
  return r;
}

async function reservarUso(livroId: string): Promise<boolean | null> {
  const db = await clienteSessao();
  const { data, error } = await db.rpc("montagem_reservar_uso", {
    p_book: livroId,
  });
  return error ? null : Boolean(data);
}

/** Páginas de renderização real (T20): o teto de 30 por minuto está no banco (Q14). */
export async function contarPaginas(
  livroId: string,
): Promise<Resposta<ContagemDoLivro>> {
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  const pode = await reservarUso(a.livro.id);
  if (pode === null) return GENERICO;
  if (!pode) return AGUARDE;
  const lida = await lerMontagem(a.livro.id);
  if (!lida) return GENERICO;
  try {
    return { ok: true, dados: contarDoConteudo(lida.conteudo, lida.hash) };
  } catch {
    return GENERICO;
  }
}

const Previa = z.object({
  titulo: z.string().max(TITULO_LIVRO_MAX * 2),
  subtitulo: z.string().max(SUBTITULO_LIVRO_MAX * 2),
  fotoId: uuid.nullable(),
  focoX: z.number().int().min(0).max(100),
  focoY: z.number().int().min(0).max(100),
  cor: z.enum(Object.keys(CAPA_CORES) as [string, ...string[]]),
  paginas: z.number().int().min(4).max(2000),
});

/** Prévia ao vivo da capa aberta, renderizada pelo próprio Typst (Q11). */
export async function previaCapa(
  livroId: string,
  entrada: unknown,
): Promise<Resposta<{ imagem: string }>> {
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  const p = Previa.safeParse(entrada);
  if (!p.success) return GENERICO;
  const pode = await reservarUso(a.livro.id);
  if (pode === null) return GENERICO;
  if (!pode) return AGUARDE;
  const lida = await lerMontagem(a.livro.id);
  if (!lida) return GENERICO;
  try {
    let miniatura: Buffer | null = null;
    let foto = null;
    if (p.data.fotoId) {
      // O id é conferido como do livro pelo banco (RLS) e o caminho pela expressão do bucket.
      const db = await clienteSessao();
      const { data } = await db
        .from("photos")
        .select("caminho, largura, altura")
        .eq("id", p.data.fotoId)
        .eq("book_id", a.livro.id)
        .maybeSingle();
      if (data && fotoDoLivro(data.caminho, a.livro.id)) {
        const r = await clienteAdmin()
          .storage.from("acervo")
          .download(data.caminho);
        if (r.data) {
          miniatura = await miniaturaDaFoto(
            Buffer.from(await r.data.arrayBuffer()),
          );
          foto = {
            caminho: data.caminho,
            largura: data.largura,
            altura: data.altura,
            foco_x: p.data.focoX,
            foco_y: p.data.focoY,
          };
        }
      }
    }
    const conteudo = {
      ...lida.conteudo,
      livro: {
        ...lida.conteudo.livro,
        titulo: p.data.titulo.trim() || null,
        subtitulo: p.data.subtitulo.trim() || null,
        capa_cor: p.data.cor,
        capa_foto: foto,
      },
    };
    return {
      ok: true,
      dados: { imagem: previaDaCapa(conteudo, p.data.paginas, miniatura) },
    };
  } catch {
    return GENERICO;
  }
}

/**
 * Publicar (só o responsável, P60): congela a versão no banco (confere o hash que a pessoa viu)
 * e põe a geração dos PDFs na fila. O evento leva só o id da versão (T36).
 */
export async function publicar(
  livroId: string,
  hash: string,
): Promise<Resposta<{ versao: number }>> {
  const a = await livroDaAcao(livroId);
  if (!a) return SEM_ACESSO;
  if (a.livro.papel !== "responsavel") {
    return { ok: false, mensagem: "Só o responsável publica o livro." };
  }
  if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) return GENERICO;
  const db = await clienteSessao();
  const { data, error } = await db.rpc("publicar_livro", {
    p_book: a.livro.id,
    p_hash: hash,
  });
  if (error) return { ok: false, mensagem: fraseDoErro(error) };
  const v = data?.[0];
  if (!v) return GENERICO;

  // Os recortes de voz que a publicação reservou (o QR é vivo, Q5) e a geração dos PDFs.
  await Promise.all(v.pedir_audio.map((codigo) => pedirRecorte(codigo)));
  try {
    await inngest.send({
      name: EVENTO_LIVRO_EXPORTAR,
      data: { export_id: v.export_id },
    });
  } catch {
    // Sem fila a versão ficaria "gerando" até expirar: falha já, e a pessoa publica de novo.
    await clienteAdmin().rpc("servico_export_falhou", {
      p_id: v.export_id,
      p_erro: "falhou_montar",
    });
  }
  const lida = await lerMontagem(a.livro.id);
  after(() =>
    registrarEvento({
      quem: a.usuario.id,
      papel: a.livro.papel,
      acao: "livro_publicado",
      livro: a.livro.id,
      detalhes: {
        export_id: v.export_id,
        versao: v.versao,
        historias:
          lida?.conteudo.historias.filter((h) => h.incluida).length ?? 0,
        mensagens:
          lida?.conteudo.mensagens.filter((m) => m.incluida).length ?? 0,
        qr: v.pedir_audio.length,
      },
    }),
  );
  revalidatePath(`/livro/${a.livro.id}/montar`);
  return { ok: true, dados: { versao: v.versao } };
}
