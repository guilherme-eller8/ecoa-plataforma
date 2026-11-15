// O QR como matriz de módulos, para o template desenhar vetorial em 100% K (Q13, T52).
// Um SVG importado entraria em RGB e viraria 4 cores na gráfica. Puro, sem servidor.
import QRCode from "qrcode";
import { QR_CORRECAO, QR_LADO_MM, QR_MARGEM_MODULOS } from "@/lib/config";
import { urlDoQr } from "@/lib/qr/codigo";

export type QrParaTypst = {
  codigo: string;
  url: string;
  /** Uma string de "0" e "1" por linha da matriz (1 = módulo escuro). */
  linhas: string[];
  modulos: number;
  /** O símbolo, sem a margem de silêncio. */
  ladoMm: number;
  margemModulos: number;
  /** A caixa inteira (símbolo + margem de silêncio): o retângulo que o servidor recorta e lê. */
  caixaMm: number;
};

export function matrizDoQr(codigo: string, maiuscula?: boolean): QrParaTypst {
  const url = urlDoQr(codigo, maiuscula);
  const qr = QRCode.create(url, { errorCorrectionLevel: QR_CORRECAO });
  const n = qr.modules.size;
  const linhas: string[] = [];
  for (let y = 0; y < n; y++) {
    let l = "";
    for (let x = 0; x < n; x++) l += qr.modules.get(y, x) ? "1" : "0";
    linhas.push(l);
  }
  return {
    codigo,
    url,
    linhas,
    modulos: n,
    ladoMm: QR_LADO_MM,
    margemModulos: QR_MARGEM_MODULOS,
    caixaMm:
      Math.round(((QR_LADO_MM * (n + 2 * QR_MARGEM_MODULOS)) / n) * 100) / 100,
  };
}
