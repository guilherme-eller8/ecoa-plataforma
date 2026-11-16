import "server-only";
// Compila os templates Typst do livro (T19, T43). Um compilador por pedido: os arquivos virtuais
// (dados, fotos) nunca se misturam entre dois pedidos ao mesmo tempo.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";
import type { DadosCapa, DadosMiolo } from "./montar-dados";
import { comoErroLivro, ErroLivro } from "./erros";

const RAIZ = "/ecoa";
const PASTA = join(process.cwd(), "lib/livro");

let fontes: Buffer[] | null = null;
function lerFontes() {
  fontes ??= [
    "Newsreader-Regular.ttf",
    "Newsreader-SemiBold.ttf",
    "Newsreader-Italic.ttf",
  ].map((f) => readFileSync(join(PASTA, "fontes", f)));
  return fontes;
}

const modelos = new Map<string, string>();
function modelo(nome: string): string {
  let t = modelos.get(nome);
  if (t === undefined) {
    t = readFileSync(join(PASTA, "typst", nome), "utf8");
    modelos.set(nome, t);
  }
  return t;
}

/** Onde um QR caiu no papel: página (de 1) e canto superior esquerdo da caixa, em pt. */
export type MarcaQr = {
  codigo: string;
  pagina: number;
  x: number;
  y: number;
  lado: number;
};

function novoCompilador(
  principal: string,
  dados: object,
  fotos: Map<string, Buffer>,
  modelosExtras: string[],
) {
  const c = NodeCompiler.create({
    workspace: RAIZ,
    fontArgs: [{ fontBlobs: lerFontes() }],
  });
  c.mapShadow(`${RAIZ}/dados.json`, Buffer.from(JSON.stringify(dados)));
  for (const nome of modelosExtras)
    c.mapShadow(`${RAIZ}/${nome}`, Buffer.from(modelo(nome)));
  for (const [arquivo, bytes] of fotos)
    c.mapShadow(`${RAIZ}/${arquivo}`, bytes);
  return { c, fonte: modelo(principal) };
}

function compilar(c: NodeCompiler, fonte: string) {
  const r = c.compile({ mainFileContent: fonte });
  const doc = r.result;
  if (!doc || r.hasError()) {
    // O diagnóstico do Typst pode citar o texto da família: só sai no log com a chave de
    // desenvolvimento ligada, nunca em produção.
    if (
      process.env.ECOA_TYPST_DEBUG === "1" &&
      process.env.NODE_ENV !== "production"
    )
      r.printErrors();
    console.error("[livro] typst com erro de compilação");
    throw new ErroLivro("falhou_typst");
  }
  return doc;
}

function lerMarcas(
  c: NodeCompiler,
  doc: ReturnType<typeof compilar>,
): MarcaQr[] {
  const itens = c.query(doc, { selector: "<qr>" }) as {
    value: MarcaQr;
  }[];
  return itens.map((i) => ({
    codigo: String(i.value.codigo),
    pagina: Number(i.value.pagina),
    x: Number(i.value.x),
    y: Number(i.value.y),
    lado: Number(i.value.lado),
  }));
}

/** Onde uma foto caiu no papel (P76): página (de 1) e caixa, em pt, a partir do canto da página. */
export type MarcaFoto = {
  arquivo: string;
  pagina: number;
  x: number;
  y: number;
  l: number;
  a: number;
};

function lerFotos(
  c: NodeCompiler,
  doc: ReturnType<typeof compilar>,
): MarcaFoto[] {
  const itens = c.query(doc, { selector: "<foto>" }) as {
    value: MarcaFoto;
  }[];
  return itens.map((i) => ({
    arquivo: String(i.value.arquivo),
    pagina: Number(i.value.pagina),
    x: Number(i.value.x),
    y: Number(i.value.y),
    l: Number(i.value.l),
    a: Number(i.value.a),
  }));
}

export type MioloCompilado = {
  paginas: number;
  marcas: MarcaQr[];
  fotos: () => MarcaFoto[];
  pdf: () => Buffer;
};

/** Compila o miolo. `fotos` vazio no modo contagem (a foto vira um cinza do mesmo tamanho). */
export function compilarMiolo(
  dados: DadosMiolo,
  fotos: Map<string, Buffer> = new Map(),
): MioloCompilado {
  try {
    const { c, fonte } = novoCompilador("miolo.typ", dados, fotos, [
      "comum.typ",
    ]);
    const doc = compilar(c, fonte);
    return {
      paginas: doc.numOfPages,
      marcas: lerMarcas(c, doc),
      fotos: () => lerFotos(c, doc),
      pdf: () =>
        c.pdf(doc, { creationTimestamp: Math.floor(Date.now() / 1000) }),
    };
  } catch (e) {
    throw comoErroLivro(e, "falhou_typst");
  }
}

export type CapaCompilada = {
  linhasDoTitulo: number;
  svg: () => string;
  pdf: () => Buffer;
};

export function compilarCapa(
  dados: DadosCapa,
  foto: Buffer | null,
): CapaCompilada {
  try {
    const fotos = new Map<string, Buffer>();
    if (foto && dados.foto) fotos.set(dados.foto.arquivo, foto);
    // Escolheu foto mas o arquivo não veio (contagem de páginas): o template desenha um cinza.
    // Sem isso o Typst não acha o arquivo e a capa inteira falha (falhou_typst).
    const pedido =
      dados.foto && !foto
        ? { ...dados, foto: { ...dados.foto, vazio: true } }
        : dados;
    const { c, fonte } = novoCompilador("capa.typ", pedido, fotos, [
      "comum.typ",
    ]);
    const doc = compilar(c, fonte);
    const m = c.query(doc, { selector: "<linhas-titulo>" }) as {
      value: number;
    }[];
    return {
      linhasDoTitulo: Number(m[0]?.value ?? 0),
      svg: () => c.svg(doc),
      pdf: () =>
        c.pdf(doc, { creationTimestamp: Math.floor(Date.now() / 1000) }),
    };
  } catch (e) {
    throw comoErroLivro(e, "falhou_typst");
  }
}

export type AmostraCompilada = {
  paginas: number;
  marcas: MarcaQr[];
  pdf: () => Buffer;
};

/** A página de amostra (A5): o mesmo capítulo do livro, com uma foto no máximo. */
export function compilarAmostra(
  dados: object,
  foto: Buffer | null,
  nomeDaFoto = "foto.jpg",
): AmostraCompilada {
  try {
    const fotos = new Map<string, Buffer>();
    if (foto) fotos.set(nomeDaFoto, foto);
    const { c, fonte } = novoCompilador("amostra.typ", dados, fotos, [
      "comum.typ",
    ]);
    const doc = compilar(c, fonte);
    return {
      paginas: doc.numOfPages,
      marcas: lerMarcas(c, doc),
      pdf: () =>
        c.pdf(doc, { creationTimestamp: Math.floor(Date.now() / 1000) }),
    };
  } catch (e) {
    throw comoErroLivro(e, "falhou_typst");
  }
}
