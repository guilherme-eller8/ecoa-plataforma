import "server-only";
// Gera os dois PDFs de uma versão publicada (design 5.5, passo 1): fotos reduzidas a 300 DPI sem
// metadados, Typst (2 compilações para o múltiplo de 4), caixas pelo mupdf, QR conferido por
// posição e prévias JPEG. Não fala com o banco nem com o Storage: quem chama injeta `baixar`.
import sharp from "sharp";
import {
  ESPEC_GRAFICA,
  FOTO_DPI_ALVO,
  FOTO_PDF_MAX_PIXELS,
  FOTO_PDF_QUALIDADE_JPEG,
  FOTOS_BAIXADAS_JUNTAS,
  TITULO_CAPA_LINHAS,
} from "@/lib/config";
import { arquivoDaMensagem, fotoDoLivro } from "@/lib/arquivos";
import { ErroLivro, comoErroLivro } from "./erros";
import { completarPaginas, especUsada, lombadaMm } from "./espec";
import {
  montarDadosCapa,
  montarDadosMiolo,
  type FotoPedida,
} from "./montar-dados";
import {
  lerConteudo,
  saiComQr,
  soIncluidas,
  type ConteudoDoLivro,
} from "./montagem";
import { conferirTodosOsQr, gravarCaixas, rasterizarEConferir } from "./pdf";
import { compilarCapa, compilarMiolo } from "./render";

export type BaixarFoto = (
  bucket: "acervo" | "mensagens",
  caminho: string,
) => Promise<Buffer>;

export type PdfsDaVersao = {
  miolo: Buffer;
  capa: Buffer;
  previas: Buffer[];
  capaPrevia: Buffer;
  paginas: number;
  lombadaMm: number;
  qrConferidos: number;
  espec: ReturnType<typeof especUsada>;
};

/** Cada foto do conteúdo tem de ser deste livro e do formato do bucket (como no CHECK do banco). */
export function conferirCaminhos(c: ConteudoDoLivro, livro: string): void {
  const ok =
    c.historias.every((h) =>
      h.fotos.every((f) => fotoDoLivro(f.caminho, livro)),
    ) &&
    (c.livro.capa_foto == null ||
      fotoDoLivro(c.livro.capa_foto.caminho, livro)) &&
    c.mensagens.every(
      (m) => m.foto == null || arquivoDaMensagem(m.foto, livro, m.id, "foto"),
    );
  if (!ok) throw new ErroLivro("falhou_foto");
}

/** Reduz ao tamanho impresso a 300 DPI (nunca aumenta), respeita a rotação do EXIF e tira todo metadado. */
export async function prepararFoto(
  bytes: Buffer,
  caixa: { larguraMm: number; alturaMm: number },
  cortar: boolean,
): Promise<Buffer> {
  try {
    return await sharp(bytes, {
      limitInputPixels: FOTO_PDF_MAX_PIXELS,
      failOn: "error",
    })
      .rotate()
      .resize({
        width: Math.round((caixa.larguraMm / 25.4) * FOTO_DPI_ALVO),
        height: Math.round((caixa.alturaMm / 25.4) * FOTO_DPI_ALVO),
        fit: cortar ? "cover" : "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: FOTO_PDF_QUALIDADE_JPEG })
      .toBuffer();
  } catch (e) {
    throw comoErroLivro(e, "falhou_foto");
  }
}

export async function emLotes<T, R>(
  itens: T[],
  juntos: number,
  f: (x: T) => Promise<R>,
) {
  const saida: R[] = new Array(itens.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(juntos, itens.length) }, async () => {
      while (i < itens.length) {
        const k = i++;
        saida[k] = await f(itens[k]);
      }
    }),
  );
  return saida;
}

export async function gerarPdfsDaVersao(args: {
  livro: string;
  versao: number;
  conteudo: unknown;
  data: Date;
  baixar: BaixarFoto;
  maiuscula?: boolean;
}): Promise<PdfsDaVersao> {
  const conteudo = soIncluidas(lerConteudo(args.conteudo));
  conferirCaminhos(conteudo, args.livro);

  const miolo = montarDadosMiolo(conteudo, {
    modo: "final",
    versao: args.versao,
    data: args.data,
    maiuscula: args.maiuscula,
  });
  const capaDados = montarDadosCapa(conteudo, { paginas: 0, guias: false });

  // Fotos: baixa 4 por vez e reduz. Cada uma entra no Typst por nome local.
  const pedidas: (FotoPedida & { cortar: boolean })[] = [
    ...miolo.fotos.map((f) => ({ ...f, cortar: f.bucket === "mensagens" })),
    ...(capaDados.foto ? [{ ...capaDados.foto, cortar: true }] : []),
  ];
  const prontas = await emLotes(pedidas, FOTOS_BAIXADAS_JUNTAS, async (f) => {
    const bruta = await args.baixar(f.bucket, f.caminho);
    return [f.arquivo, await prepararFoto(bruta, f, f.cortar)] as const;
  });
  const fotos = new Map<string, Buffer>(prontas);
  const fotosDoMiolo = new Map(
    [...fotos].filter(([a]) => a !== capaDados.foto?.arquivo),
  );

  try {
    // Miolo em 2 compilações: a 1ª conta as páginas; a 2ª acrescenta os brancos até o múltiplo.
    const primeira = compilarMiolo(miolo.dados, fotosDoMiolo);
    const total = completarPaginas(primeira.paginas);
    const final =
      total === primeira.paginas
        ? primeira
        : compilarMiolo(
            { ...miolo.dados, brancos: total - primeira.paginas },
            fotosDoMiolo,
          );

    const lomb = lombadaMm(total);
    const capaFinal = montarDadosCapa(conteudo, {
      paginas: total,
      guias: false,
    });
    const capaCompilada = compilarCapa(
      capaFinal.dados,
      capaFinal.foto ? (fotos.get(capaFinal.foto.arquivo) ?? null) : null,
    );
    if (capaCompilada.linhasDoTitulo > TITULO_CAPA_LINHAS)
      throw new ErroLivro("titulo_capa_longo");

    const mioloPdf = await gravarCaixas(
      final.pdf(),
      ESPEC_GRAFICA.miolo.sangriaMm,
    );
    const capaPdf = await gravarCaixas(
      capaCompilada.pdf(),
      ESPEC_GRAFICA.capa.dobraMm,
    );

    // Conferência: cada QR que vai impresso, lido do PDF de verdade, na sua posição.
    const esperados = [
      ...conteudo.historias.filter(saiComQr).map((h) => h.qr!.codigo),
      ...conteudo.mensagens.filter(saiComQr).map((m) => m.qr!.codigo),
    ];
    const { previas, lidos } = await rasterizarEConferir(
      mioloPdf,
      final.marcas,
      {
        maiuscula: args.maiuscula,
      },
    );
    const qrConferidos = conferirTodosOsQr(
      esperados,
      final.marcas,
      lidos,
      args.maiuscula,
    );
    const capaRast = await rasterizarEConferir(capaPdf, [], {});

    return {
      miolo: mioloPdf,
      capa: capaPdf,
      previas,
      capaPrevia: capaRast.previas[0],
      paginas: total,
      lombadaMm: lomb,
      qrConferidos,
      espec: especUsada(),
    };
  } catch (e) {
    throw comoErroLivro(e, "falhou_montar");
  }
}
