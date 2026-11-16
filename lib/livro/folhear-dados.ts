// Folhear o livro antes de publicar (P72): o mesmo JSON do PDF final (T20), com duas diferenças
// só da tela. 1) As fotos entram de verdade, reduzidas. 2) A história ou mensagem que vai sair
// com QR mas ainda não tem código (o QR nasce ao publicar) ganha um QR provisório, no mesmo
// lugar e tamanho; a rasterização cobre esse quadrado com um tracejado. Puro: testável sem Typst.
import { dataPorExtenso, montarDadosMiolo } from "./montar-dados";
import {
  saiComQr,
  soIncluidas,
  vaiComQr,
  type ConteudoDoLivro,
} from "./montagem";
import { matrizDoQr } from "./qr-matriz";

/**
 * Código do QR provisório. Tem o formato de um código para o QR sair do tamanho certo; um sorteio
 * igual é desprezível (1 em 30⁸) e, de todo modo, o quadrado dele sai sempre coberto na imagem.
 */
export const QR_PROVISORIO = "ZZZZZZZZ";

export function dadosDoFolheio(conteudo: ConteudoDoLivro, data: Date) {
  const c = soIncluidas(conteudo);
  const miolo = montarDadosMiolo(c, { modo: "final", versao: null, data });
  const provisorio = {
    ...matrizDoQr(QR_PROVISORIO),
    // A legenda diz o que acontece, no lugar do código que ainda não existe.
    impresso: "ao publicar",
    aponte: "o QR nasce",
  };
  let provisorios = 0;
  // montarDadosMiolo mantém a ordem de soIncluidas: o índice casa um a um.
  const historias = miolo.dados.historias.map((h, i) => {
    const x = c.historias[i];
    if (h.qr || saiComQr(x) || !vaiComQr(x)) return h;
    provisorios++;
    return { ...h, qr: provisorio };
  });
  const mensagens = miolo.dados.mensagens.map((m, i) => {
    const x = c.mensagens[i];
    if (m.qr || saiComQr(x) || !vaiComQr(x)) return m;
    provisorios++;
    return { ...m, qr: provisorio };
  });
  return {
    dados: {
      ...miolo.dados,
      // Sem número de versão: a prévia ainda não é uma (a publicação é que numera, T22).
      colofao: { linha: `${dataPorExtenso(data)} · prévia` },
      historias,
      mensagens,
    },
    fotos: miolo.fotos,
    provisorios,
    historias: c.historias.length,
  };
}
