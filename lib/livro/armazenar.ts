import "server-only";
// Storage e banco da geração dos PDFs: o único arquivo do prompt 13 que fala com a chave secreta.
// Cada passo devolve só ids, pasta e números (T36): nenhum texto do livro passa pelo Inngest.
import { randomBytes } from "node:crypto";
import { EXPORT_BUCKET } from "@/lib/config";
import { registrarEvento } from "@/lib/eventos";
import { clienteAdmin } from "@/lib/supabase/admin";
import { ErroLivro, comoErroLivro } from "./erros";
import { gerarPdfsDaVersao } from "./exportar";
import { pastaDaVersao } from "./eventos";

type Bucket = "acervo" | "mensagens";

export type ResultadoDaGeracao = {
  pasta: string;
  paginas: number;
  lombadaMm: number;
  mioloBytes: number;
  capaBytes: number;
  qrConferidos: number;
  espec: unknown;
};

/** Passo 1: baixa, monta, confere e sobe. Devolve só pasta e números. */
export async function gerarESubir(
  exportId: string,
): Promise<ResultadoDaGeracao | null> {
  const db = clienteAdmin();
  const { data, error } = await db.rpc("servico_export_conteudo", {
    p_id: exportId,
  });
  if (error) throw new ErroLivro("falhou_montar");
  const v = data?.[0];
  if (!v || v.estado !== "gerando") return null; // já terminou ou expirou: nada a fazer

  const baixar = async (bucket: Bucket, caminho: string) => {
    const r = await db.storage.from(bucket).download(caminho);
    if (r.error || !r.data) throw new ErroLivro("falhou_foto");
    return Buffer.from(await r.data.arrayBuffer());
  };
  const r = await gerarPdfsDaVersao({
    livro: v.book_id,
    versao: v.versao,
    conteudo: v.conteudo,
    data: new Date(v.criado_em),
    baixar,
  });

  // Uma pasta nova por tentativa: uma geração repetida nunca mistura arquivos com outra.
  const pasta = pastaDaVersao(
    v.book_id,
    v.versao,
    randomBytes(6).toString("hex"),
  );
  const sobe = async (nome: string, bytes: Buffer, tipo: string) => {
    const { error: e } = await db.storage
      .from(EXPORT_BUCKET)
      .upload(`${pasta}/${nome}`, bytes, { contentType: tipo, upsert: false });
    if (e) throw new ErroLivro("falhou_upload");
  };
  try {
    await sobe("miolo.pdf", r.miolo, "application/pdf");
    await sobe("capa.pdf", r.capa, "application/pdf");
    await sobe("capa.jpg", r.capaPrevia, "image/jpeg");
    for (let i = 0; i < r.previas.length; i++) {
      await sobe(
        `p${String(i + 1).padStart(3, "0")}.jpg`,
        r.previas[i],
        "image/jpeg",
      );
    }
  } catch (e) {
    await apagarPasta(pasta);
    throw comoErroLivro(e, "falhou_upload");
  }
  return {
    pasta,
    paginas: r.paginas,
    lombadaMm: r.lombadaMm,
    mioloBytes: r.miolo.length,
    capaBytes: r.capa.length,
    qrConferidos: r.qrConferidos,
    espec: r.espec,
  };
}

/** Apaga a pasta de uma tentativa (erro no meio, ou a versão expirou enquanto o job rodava). */
export async function apagarPasta(pasta: string): Promise<void> {
  const db = clienteAdmin().storage.from(EXPORT_BUCKET);
  const { data } = await db.list(pasta, { limit: 1000 });
  const nomes = (data ?? []).map((a) => `${pasta}/${a.name}`);
  if (nomes.length) await db.remove(nomes);
}

/** Passo 2: o banco confere que todos os QR foram lidos (qr_conferidos = qr_esperados). */
export async function gravarPronto(
  exportId: string,
  r: ResultadoDaGeracao,
): Promise<"pronta" | "expirou"> {
  const db = clienteAdmin();
  const { data, error } = await db.rpc("servico_export_pronto", {
    p_id: exportId,
    p_espec: r.espec as never,
    p_paginas: r.paginas,
    p_lombada_mm: r.lombadaMm,
    p_pasta: r.pasta,
    p_miolo_bytes: r.mioloBytes,
    p_capa_bytes: r.capaBytes,
    p_qr_conferidos: r.qrConferidos,
  });
  if (error) {
    await apagarPasta(r.pasta);
    throw new ErroLivro("qr_nao_conferido");
  }
  if (!data) {
    // A versão expirou enquanto o job rodava: ninguém vai usar esta pasta.
    await apagarPasta(r.pasta);
    return "expirou";
  }
  const { data: ex } = await db
    .from("book_exports")
    .select("book_id, versao")
    .eq("id", exportId)
    .maybeSingle();
  await registrarEvento({
    quem: null,
    papel: "sistema",
    acao: "livro_pronto",
    livro: ex?.book_id ?? null,
    detalhes: {
      export_id: exportId,
      versao: ex?.versao ?? null,
      paginas: r.paginas,
      qr: r.qrConferidos,
    },
  });
  return "pronta";
}

/** Depois de todas as tentativas: a versão falha com um código fixo (nunca a mensagem do erro). */
export async function marcarFalha(exportId: string, erro: string | undefined) {
  const db = clienteAdmin();
  const codigo = /^[a-z_]{2,40}$/.test(erro ?? "")
    ? (erro as string)
    : "falhou_montar";
  const { data } = await db.rpc("servico_export_falhou", {
    p_id: exportId,
    p_erro: codigo,
  });
  if (!data) return;
  const { data: ex } = await db
    .from("book_exports")
    .select("book_id, versao")
    .eq("id", exportId)
    .maybeSingle();
  await registrarEvento({
    quem: null,
    papel: "sistema",
    acao: "livro_falhou",
    livro: ex?.book_id ?? null,
    detalhes: { export_id: exportId, versao: ex?.versao ?? null, erro: codigo },
  });
}
