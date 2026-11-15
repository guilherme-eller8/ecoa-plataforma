import "server-only";
// Contagem de páginas e prévia da capa (T20, Q11): o mesmo Typst do PDF final, sem baixar foto.
// Resultado guardado em memória pelo hash do conteúdo: a mesma montagem não compila duas vezes.
import sharp from "sharp";
import { PREVIA_CAPA_MINIATURA_PX } from "@/lib/config";
import { alertasDoLivro } from "./alertas";
import { completarPaginas } from "./espec";
import { paginasExtras } from "./espec";
import { comoErroLivro } from "./erros";
import { montarDadosCapa, montarDadosMiolo } from "./montar-dados";
import { soIncluidas, type ConteudoDoLivro } from "./montagem";
import type { ContagemDoLivro } from "./montar-tipos";
import { compilarCapa, compilarMiolo } from "./render";

const memoria = new Map<string, ContagemDoLivro>();
const MAX_NA_MEMORIA = 50;

export function contarDoConteudo(
  conteudo: ConteudoDoLivro,
  hash: string,
): ContagemDoLivro {
  const guardada = hash ? memoria.get(hash) : undefined;
  if (guardada) return guardada;
  const c = soIncluidas(conteudo);
  const { dados } = montarDadosMiolo(c, {
    modo: "contagem",
    versao: null,
    data: new Date(),
  });
  const paginas = completarPaginas(compilarMiolo(dados).paginas);
  const capa = montarDadosCapa(c, { paginas, guias: false });
  const linhasDoTitulo = c.livro.titulo?.trim()
    ? compilarCapa(capa.dados, null).linhasDoTitulo
    : 0;
  const r: ContagemDoLivro = {
    paginas,
    extras: paginasExtras(paginas),
    hash,
    linhasDoTitulo,
    alertas: alertasDoLivro(conteudo, { tituloCapaLinhas: linhasDoTitulo }),
  };
  if (hash) {
    if (memoria.size >= MAX_NA_MEMORIA)
      memoria.delete(memoria.keys().next().value as string);
    memoria.set(hash, r);
  }
  return r;
}

/** Miniatura da foto da capa (o original tem até 5 MB; o SVG da prévia fica em ~80 KB). */
export async function miniaturaDaFoto(bytes: Buffer): Promise<Buffer> {
  try {
    return await sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({
        width: PREVIA_CAPA_MINIATURA_PX,
        height: PREVIA_CAPA_MINIATURA_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 70 })
      .toBuffer();
  } catch (e) {
    throw comoErroLivro(e, "falhou_foto");
  }
}

/** A capa aberta para a tela, com as linhas das dobras e da lombada (nunca no PDF). */
export function previaDaCapa(
  conteudo: ConteudoDoLivro,
  paginas: number,
  miniatura: Buffer | null,
): string {
  const { dados } = montarDadosCapa(conteudo, { paginas, guias: true });
  const svg = compilarCapa(dados, miniatura).svg();
  // data: URL num <img>: o navegador não executa script de um SVG assim.
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
