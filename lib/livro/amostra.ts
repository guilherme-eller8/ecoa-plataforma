import "server-only";
// Página de amostra em PDF (seção 5.3 do prompt 10, T43), em A5 e com o capítulo do livro (Q4).
// Um compilador por pedido: os arquivos virtuais nunca se misturam entre dois pedidos.
import { APONTE_E_OUCA, geometriaDoMiolo } from "./montar-dados";
import { caixaDaFoto } from "./fotos";
import { codigoImpresso } from "@/lib/qr/codigo";
import { matrizDoQr } from "./qr-matriz";
import { compilarAmostra, type MarcaQr } from "./render";

export type DadosAmostra = {
  titulo: string;
  ano: number | null;
  paragrafos: string[];
  codigo: string;
  foto: { bytes: Buffer; largura: number | null; altura: number | null } | null;
  maiuscula?: boolean; // formato da URL do QR (Q4); padrão: QR_URL_MAIUSCULA
};

export type ResultadoAmostra = {
  pdf: Buffer;
  cortado: boolean;
  url: string;
  /** Onde o QR caiu no papel: a conferência lê só esse quadrado. */
  marca: MarcaQr;
};

function frases(p: string) {
  return (
    p.match(/[^.!?…]+[.!?…]+["”»)]*\s*|[^.!?…]+$/g)?.map((s) => s.trim()) ?? [p]
  );
}

export async function gerarAmostra(d: DadosAmostra): Promise<ResultadoAmostra> {
  const qr = matrizDoQr(d.codigo, d.maiuscula);
  const foto = d.foto ? { arquivo: "foto.jpg", ...caixaDaFoto(d.foto) } : null;
  const base = {
    g: geometriaDoMiolo(),
    continua: "Continua no livro.",
  };
  const historia = (paragrafos: string[]) => ({
    titulo: d.titulo,
    ano: d.ano,
    paragrafos,
    fotos: foto ? [foto] : [],
    qr: { ...qr, impresso: codigoImpresso(d.codigo), aponte: APONTE_E_OUCA },
  });
  const compilar = (paragrafos: string[], cortado: boolean) =>
    compilarAmostra(
      { ...base, cortado, historia: historia(paragrafos) },
      d.foto?.bytes ?? null,
    );
  const cabe = (p: string[], cortado: boolean) =>
    compilar(p, cortado).paginas === 1;

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
  const final = compilar(paragrafos, cortado);
  return { pdf: final.pdf(), cortado, url: qr.url, marca: final.marcas[0] };
}
