import "server-only";
// Página de amostra em PDF (seção 5.3, T43). Um compilador por pedido: os arquivos virtuais
// (dados, foto, QR) nunca se misturam entre dois pedidos ao mesmo tempo.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";
import QRCode from "qrcode";
import { QR_CORRECAO, QR_LADO_MM, QR_MARGEM_MODULOS } from "@/lib/config";
import { codigoImpresso, urlDoQr } from "@/lib/qr/codigo";

const PASTA = join(process.cwd(), "lib/livro");
const RAIZ = "/ecoa";
const FOTO_MAX_MM = 70;
const LARGURA_TEXTO_MM = 172;

let fontes: Buffer[] | null = null;
function lerFontes() {
  fontes ??= [
    "Newsreader-Regular.ttf",
    "Newsreader-SemiBold.ttf",
    "Newsreader-Italic.ttf",
  ].map((f) => readFileSync(join(PASTA, "fontes", f)));
  return fontes;
}

export type DadosAmostra = {
  titulo: string;
  ano: number | null;
  paragrafos: string[];
  codigo: string;
  foto: { bytes: Buffer; largura: number | null; altura: number | null } | null;
  maiuscula?: boolean; // formato da URL do QR (Q4); padrão: QR_URL_MAIUSCULA
};

export type ResultadoAmostra = { pdf: Buffer; cortado: boolean; url: string };

/** O QR em SVG e o tamanho da caixa (símbolo de QR_LADO_MM + margem de silêncio). */
export async function qrDoCodigo(url: string) {
  const qr = QRCode.create(url, { errorCorrectionLevel: QR_CORRECAO });
  const n = qr.modules.size;
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: QR_CORRECAO,
    margin: QR_MARGEM_MODULOS,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return {
    svg,
    caixaMm: (QR_LADO_MM * (n + 2 * QR_MARGEM_MODULOS)) / n,
    versao: qr.version,
  };
}

function alturaDaFoto(foto: DadosAmostra["foto"]) {
  if (!foto) return null;
  if (!foto.largura || !foto.altura) return FOTO_MAX_MM;
  return (
    Math.round(
      Math.min(FOTO_MAX_MM, (LARGURA_TEXTO_MM * foto.altura) / foto.largura) *
        10,
    ) / 10
  );
}

function frases(p: string) {
  return (
    p.match(/[^.!?…]+[.!?…]+["”»)]*\s*|[^.!?…]+$/g)?.map((s) => s.trim()) ?? [p]
  );
}

export async function gerarAmostra(d: DadosAmostra): Promise<ResultadoAmostra> {
  const url = urlDoQr(d.codigo, d.maiuscula);
  const qr = await qrDoCodigo(url);
  const compilador = NodeCompiler.create({
    workspace: RAIZ,
    fontArgs: [{ fontBlobs: lerFontes() }],
  });
  const fonte = readFileSync(join(PASTA, "amostra.typ"), "utf8");
  compilador.mapShadow(`${RAIZ}/qr.svg`, Buffer.from(qr.svg));
  if (d.foto) compilador.mapShadow(`${RAIZ}/foto.jpg`, d.foto.bytes);
  const base = {
    titulo: d.titulo,
    ano: d.ano,
    foto: alturaDaFoto(d.foto),
    qr: {
      caixa: qr.caixaMm,
      aponte: "aponte e ouça",
      codigo: codigoImpresso(d.codigo),
    },
    continua: "Continua no livro.",
  };

  function compilar(paragrafos: string[], cortado: boolean) {
    compilador.mapShadow(
      `${RAIZ}/dados.json`,
      Buffer.from(JSON.stringify({ ...base, paragrafos, cortado })),
    );
    const r = compilador.compile({ mainFileContent: fonte });
    const doc = r.result;
    if (!doc || r.hasError()) throw new Error("amostra:typst");
    return doc;
  }
  const cabe = (p: string[], cortado: boolean) =>
    compilar(p, cortado).numOfPages === 1;

  // Tudo cabe? Senão, o maior número de parágrafos inteiros (divisão binária); se nem o 1º
  // cabe, as frases dele que couberem.
  let paragrafos = d.paragrafos.filter((p) => p.trim());
  let cortado = false;
  if (!cabe(paragrafos, false)) {
    cortado = true;
    let lo = 0;
    let hi = paragrafos.length - 1;
    while (lo < hi) {
      const m = Math.ceil((lo + hi) / 2);
      if (cabe(paragrafos.slice(0, m), true)) lo = m;
      else hi = m - 1;
    }
    if (lo > 0) paragrafos = paragrafos.slice(0, lo);
    else {
      const f = frases(paragrafos[0] ?? "");
      let n = 0;
      while (n < f.length && cabe([f.slice(0, n + 1).join(" ")], true)) n++;
      paragrafos = n ? [f.slice(0, n).join(" ")] : [];
    }
  }
  const doc = compilar(paragrafos, cortado);
  const pdf = compilador.pdf(doc, {
    creationTimestamp: Math.floor(Date.now() / 1000),
  });
  return { pdf, cortado, url };
}
