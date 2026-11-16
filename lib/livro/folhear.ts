import "server-only";
// Folhear o livro antes de publicar (P72). O mesmo Typst do PDF final (T20); nada é gravado:
// o PDF da prévia fica em memória pelo hash do conteúdo, e cada pedido rasteriza só as páginas
// que a tela vai mostrar. Fotos reduzidas (a prévia não é o arquivo da gráfica).
import sharp from "sharp";
import {
  FOLHEAR_DPI,
  FOLHEAR_FOTO_PX,
  FOTOS_BAIXADAS_JUNTAS,
} from "@/lib/config";
import { miniaturaDaFoto, previaDaCapa } from "./contar";
import { comoErroLivro } from "./erros";
import { completarPaginas, mmParaPt, paginaDoMiolo } from "./espec";
import { conferirCaminhos, emLotes, type BaixarFoto } from "./exportar";
import {
  dadosDoFolheio,
  fotosDoFolheio,
  QR_PROVISORIO,
  type FotoDoFolheio,
} from "./folhear-dados";
import { soIncluidas, type ConteudoDoLivro } from "./montagem";
import { rasterizarPaginas } from "./pdf";
import { aplicarRecorte } from "./recortar-foto";
import { compilarMiolo, type MarcaQr } from "./render";

export type Folheio = {
  pdf: Buffer;
  paginas: number;
  historias: number;
  /** Onde estão os QR provisórios (cobertos por um tracejado na imagem). */
  cobrir: MarcaQr[];
  /** A capa aberta (frente, lombada e verso), em SVG, como na montagem. */
  capa: string;
  /** P76: cada foto de história no papel, em % da página, para o toque que abre "Ajustar". */
  toques: ToqueNaFoto[];
};

export type ToqueNaFoto = FotoDoFolheio & {
  pagina: number;
  x: number;
  y: number;
  l: number;
  a: number;
};

const MAX_NA_MEMORIA = 3;
const memoria = new Map<string, Promise<Folheio>>();

async function reduzir(
  bytes: Buffer,
  caixa: { larguraMm: number; alturaMm: number },
  cortar: boolean,
): Promise<Buffer> {
  try {
    const largura = FOLHEAR_FOTO_PX;
    const altura = Math.round((largura * caixa.alturaMm) / caixa.larguraMm);
    return await sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({
        width: largura,
        height: altura,
        fit: cortar ? "cover" : "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 72 })
      .toBuffer();
  } catch (e) {
    throw comoErroLivro(e, "falhou_foto");
  }
}

async function montar(
  livro: string,
  conteudo: ConteudoDoLivro,
  baixar: BaixarFoto,
): Promise<Folheio> {
  const c = soIncluidas(conteudo);
  conferirCaminhos(c, livro);
  const f = dadosDoFolheio(c, new Date());
  const prontas = await emLotes(f.fotos, FOTOS_BAIXADAS_JUNTAS, async (p) => [
    p.arquivo,
    await reduzir(
      await aplicarRecorte(await baixar(p.bucket, p.caminho), p.recorte),
      p,
      p.bucket === "mensagens",
    ),
  ]);
  const fotos = new Map(prontas as [string, Buffer][]);

  const primeira = compilarMiolo(f.dados, fotos);
  const total = completarPaginas(primeira.paginas);
  const final =
    total === primeira.paginas
      ? primeira
      : compilarMiolo({ ...f.dados, brancos: total - primeira.paginas }, fotos);

  const capaFoto = c.livro.capa_foto
    ? await miniaturaDaFoto(await baixar("acervo", c.livro.capa_foto.caminho))
    : null;

  const pagina = paginaDoMiolo();
  const lPt = mmParaPt(pagina.larguraMm);
  const aPt = mmParaPt(pagina.alturaMm);
  const deQuem = fotosDoFolheio(c);
  const pct = (n: number, de: number) => Math.round((n / de) * 10000) / 100;
  const toques = final.fotos().flatMap((m) => {
    const f = deQuem.get(m.arquivo);
    return f
      ? [
          {
            ...f,
            pagina: m.pagina,
            x: pct(m.x, lPt),
            y: pct(m.y, aPt),
            l: pct(m.l, lPt),
            a: pct(m.a, aPt),
          },
        ]
      : [];
  });

  return {
    toques,
    pdf: final.pdf(),
    paginas: total,
    historias: f.historias,
    cobrir: final.marcas.filter((m) => m.codigo === QR_PROVISORIO),
    capa: previaDaCapa(c, total, capaFoto),
  };
}

/** Já montado nesta instância para este conteúdo? (Quem chama só gasta a cota quando não.) */
export function folheioGuardado(livro: string, hash: string): boolean {
  return Boolean(hash) && memoria.has(`${livro}:${hash}`);
}

/** O folheio deste conteúdo: montado uma vez por hash e reaproveitado. */
export function folheioDoLivro(
  livro: string,
  conteudo: ConteudoDoLivro,
  hash: string,
  baixar: BaixarFoto,
): Promise<Folheio> {
  const chave = `${livro}:${hash}`;
  const guardado = hash ? memoria.get(chave) : undefined;
  if (guardado) return guardado;
  const p = montar(livro, conteudo, baixar);
  if (hash) {
    if (memoria.size >= MAX_NA_MEMORIA)
      memoria.delete(memoria.keys().next().value as string);
    memoria.set(chave, p);
    // Falhou: sai da memória para a próxima tentativa montar de novo.
    p.catch(() => memoria.delete(chave));
  }
  return p;
}

/** As páginas `de`..`ate` em JPEG (data: URL), com os QR provisórios cobertos. */
export async function paginasDoFolheio(
  f: Folheio,
  de: number,
  ate: number,
): Promise<string[]> {
  const jpegs = await rasterizarPaginas(f.pdf, de, ate, FOLHEAR_DPI, f.cobrir);
  return jpegs.map((j) => `data:image/jpeg;base64,${j.toString("base64")}`);
}
