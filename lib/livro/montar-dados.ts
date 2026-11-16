// Do conteúdo do livro (banco) para o JSON que os templates Typst leem (T43: todo texto da
// família entra como dado, nunca como código). Puro: não baixa foto, não compila nada.
import {
  CAPA_CORES,
  ESPEC_GRAFICA,
  LAYOUT_MIOLO,
  MARCA,
  TITULO_CAPA_LINHAS,
} from "@/lib/config";
import { codigoImpresso } from "@/lib/qr/codigo";
import { capaAberta, larguraTextoMm, paginaDoMiolo } from "./espec";
import { caixaImpressa } from "./fotos";
import {
  corDaCapa,
  paragrafosDaMensagem,
  saiComQr,
  soIncluidas,
  type ConteudoDoLivro,
} from "./montagem";
import { matrizDoQr, type QrParaTypst } from "./qr-matriz";
import type { Recorte } from "./recorte";

export type FotoParaTypst = {
  arquivo: string;
  larguraMm: number;
  alturaMm: number;
};
/** A foto da capa: a imagem cobre a caixa (cover) e o foco decide que parte fica à vista. */
export type FotoDaCapaParaTypst = FotoParaTypst & {
  imgLarguraMm: number;
  imgAlturaMm: number;
  dxMm: number; // deslocamento da imagem dentro da caixa (≤ 0)
  dyMm: number;
  /** Sem o arquivo (contagem de páginas): a caixa sai cinza, como no miolo. */
  vazio?: boolean;
};
export type FotoPedida = {
  arquivo: string; // nome local no Typst: nunca o caminho do Storage
  bucket: "acervo" | "mensagens";
  caminho: string;
  larguraMm: number;
  alturaMm: number;
  largura: number | null; // pixels do original (do banco)
  altura: number | null;
  /** P75: o servidor corta a foto antes de reduzir (null = inteira). */
  recorte?: Recorte | null;
};

export type QrDoTypst = QrParaTypst & { impresso: string; aponte: string };

export type DadosMiolo = {
  modo: "contagem" | "final";
  g: {
    paginaL: number;
    paginaA: number;
    sangria: number;
    interna: number;
    externa: number;
    cabeca: number;
    pe: number;
    corpo: number;
    texto: number;
  };
  livro: {
    titulo: string;
    subtitulo: string | null;
    autor: string | null;
    dedicatoria: string[];
  };
  rotulos: { sumario: string; mensagens: string; colofao: string };
  colofao: { linha: string };
  brancos: number;
  historias: {
    titulo: string;
    ano: number | null;
    paragrafos: string[];
    fotos: FotoParaTypst[];
    /** P75: a 1ª foto numa página inteira, ao lado da abertura (null = junto com a história). */
    lado: FotoParaTypst | null;
    qr: QrDoTypst | null;
  }[];
  mensagens: {
    nome: string;
    relacao: string;
    paragrafos: string[];
    foto: FotoParaTypst | null;
    qr: QrDoTypst | null;
  }[];
};

export const APONTE_E_OUCA = "aponte e ouça";

function qrDoTypst(
  x: { qr: { codigo: string; ligado: boolean } | null },
  maiuscula?: boolean,
): QrDoTypst | null {
  if (!x.qr || !saiComQr({ qr: x.qr })) return null;
  const m = matrizDoQr(x.qr.codigo, maiuscula);
  return { ...m, impresso: codigoImpresso(x.qr.codigo), aponte: APONTE_E_OUCA };
}

export function geometriaDoMiolo(): DadosMiolo["g"] {
  const p = paginaDoMiolo();
  return {
    paginaL: p.larguraMm,
    paginaA: p.alturaMm,
    sangria: p.sangriaMm,
    interna: LAYOUT_MIOLO.margemInternaMm,
    externa: LAYOUT_MIOLO.margemExternaMm,
    cabeca: LAYOUT_MIOLO.margemCabecaMm,
    pe: LAYOUT_MIOLO.margemPeMm,
    corpo: LAYOUT_MIOLO.corpoPt,
    texto: larguraTextoMm(),
  };
}

/** "15 de novembro de 2026". */
export function dataPorExtenso(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

/**
 * Monta o JSON do miolo a partir do que entra no livro (só as incluídas, na ordem da montagem).
 * `fotos` lista o que o servidor precisa baixar; cada foto entra no Typst por nome local.
 */
export function montarDadosMiolo(
  conteudo: ConteudoDoLivro,
  opcoes: {
    modo: "contagem" | "final";
    brancos?: number;
    versao: number | null;
    data: Date;
    maiuscula?: boolean;
  },
): { dados: DadosMiolo; fotos: FotoPedida[] } {
  const c = soIncluidas(conteudo);
  const fotos: FotoPedida[] = [];
  const pedir = (
    arquivo: string,
    bucket: FotoPedida["bucket"],
    caminho: string,
    dim: {
      largura: number | null;
      altura: number | null;
      recorte?: Recorte | null;
    },
    caixa: { larguraMm: number; alturaMm: number },
  ): FotoParaTypst => {
    fotos.push({
      arquivo,
      bucket,
      caminho,
      ...caixa,
      largura: dim.largura,
      altura: dim.altura,
      recorte: dim.recorte ?? null,
    });
    return { arquivo, ...caixa };
  };

  const historias = c.historias.map((h, i) => {
    const pedidas = h.fotos.map((f, j) =>
      pedir(
        `foto-h${i + 1}-${j + 1}.jpg`,
        "acervo",
        f.caminho,
        f,
        caixaImpressa(f, j === 0),
      ),
    );
    // P75: a 1ª foto marcada vai para a página inteira ao lado; as outras seguem depois do texto.
    const lado = h.fotos[0]?.ao_lado ? pedidas[0] : null;
    return {
      titulo: h.titulo?.trim() ?? "",
      ano: h.ano,
      paragrafos: h.paragrafos,
      fotos: lado ? pedidas.slice(1) : pedidas,
      lado,
      qr: qrDoTypst(h, opcoes.maiuscula),
    };
  });
  const msgBox = LAYOUT_MIOLO.fotoMensagemMm;
  const mensagens = c.mensagens.map((m, i) => ({
    nome: m.nome,
    relacao: m.relacao,
    paragrafos: paragrafosDaMensagem(m.texto),
    foto: m.foto
      ? pedir(
          `foto-m${i + 1}.jpg`,
          "mensagens",
          m.foto,
          { largura: null, altura: null },
          { larguraMm: msgBox.largura, alturaMm: msgBox.altura },
        )
      : null,
    qr: qrDoTypst(m, opcoes.maiuscula),
  }));

  const versao = opcoes.versao ?? 0;
  return {
    fotos,
    dados: {
      modo: opcoes.modo,
      g: geometriaDoMiolo(),
      livro: {
        titulo: c.livro.titulo?.trim() ?? "",
        subtitulo: c.livro.subtitulo?.trim() || null,
        autor: c.livro.autor?.trim() || null,
        dedicatoria: (c.livro.dedicatoria ?? "")
          .split(/\n+/)
          .map((p) => p.trim())
          .filter(Boolean),
      },
      rotulos: {
        sumario: "Sumário",
        mensagens: "Mensagens da família",
        colofao: `Livro feito com a ${MARCA}`,
      },
      colofao: {
        linha: `${dataPorExtenso(opcoes.data)} · versão ${versao}`,
      },
      brancos: opcoes.brancos ?? 0,
      historias,
      mensagens,
    },
  };
}

export type DadosCapa = {
  guias: boolean;
  w: number;
  h: number;
  lombada: number;
  versoX: number;
  lombadaX: number;
  frenteX: number;
  dobra: number;
  papelaoL: number;
  papelaoA: number;
  margem: number;
  lombadaMinTexto: number;
  corte: { x: number; y: number; l: number; a: number };
  cor: { cmyk: readonly number[]; claro: boolean };
  titulo: string;
  subtitulo: string | null;
  autor: string | null;
  linhasMax: number;
  foto: FotoDaCapaParaTypst | null;
  marca: string;
};

/** A foto da capa entra num retângulo de 135 × 105 mm, cortada para preencher (fit cover). */
export function fotoDaCapaMm() {
  const { margemTextoMm } = ESPEC_GRAFICA.capa;
  const larg =
    ESPEC_GRAFICA.miolo.larguraMm +
    ESPEC_GRAFICA.capa.projecaoMm -
    2 * margemTextoMm;
  return { larguraMm: larg, alturaMm: 105 };
}

/**
 * A imagem cobre a caixa sem deformar; o que sobra de um lado é cortado conforme o foco
 * (0 = mostra o começo da foto, 100 = o fim, 50 = centro). Sem proporção conhecida: 4:3.
 */
export function enquadrarFoto(
  caixa: { larguraMm: number; alturaMm: number },
  foto: { largura: number | null; altura: number | null },
  foco: { x: number; y: number },
) {
  const r =
    foto.largura && foto.altura && foto.largura > 0 && foto.altura > 0
      ? foto.largura / foto.altura
      : 4 / 3;
  const quadro = caixa.larguraMm / caixa.alturaMm;
  const imgLarguraMm = r > quadro ? caixa.alturaMm * r : caixa.larguraMm;
  const imgAlturaMm = r > quadro ? caixa.alturaMm : caixa.larguraMm / r;
  const pct = (n: number) => Math.min(100, Math.max(0, n)) / 100;
  const arred = (n: number) => Math.round(n * 100) / 100 + 0; // + 0 troca -0 por 0
  return {
    imgLarguraMm: arred(imgLarguraMm),
    imgAlturaMm: arred(imgAlturaMm),
    dxMm: arred(-(imgLarguraMm - caixa.larguraMm) * pct(foco.x)),
    dyMm: arred(-(imgAlturaMm - caixa.alturaMm) * pct(foco.y)),
  };
}

export function montarDadosCapa(
  conteudo: ConteudoDoLivro,
  opcoes: { paginas: number; guias: boolean; fotoArquivo?: string | null },
): { dados: DadosCapa; foto: FotoPedida | null } {
  const cap = capaAberta(opcoes.paginas);
  const cor = CAPA_CORES[corDaCapa(conteudo.livro.capa_cor)];
  const f = conteudo.livro.capa_foto;
  const caixa = fotoDaCapaMm();
  const arquivo = "capa-foto.jpg";
  const foto: FotoPedida | null = f
    ? {
        arquivo,
        bucket: "acervo",
        caminho: f.caminho,
        ...caixa,
        largura: f.largura,
        altura: f.altura,
      }
    : null;
  return {
    foto,
    dados: {
      guias: opcoes.guias,
      w: cap.larguraMm,
      h: cap.alturaMm,
      lombada: cap.lombadaMm,
      versoX: cap.versoX,
      lombadaX: cap.lombadaX,
      frenteX: cap.frenteX,
      dobra: cap.dobraMm,
      papelaoL: cap.papelaoLarguraMm,
      papelaoA: cap.papelaoAlturaMm,
      margem: ESPEC_GRAFICA.capa.margemTextoMm,
      lombadaMinTexto: ESPEC_GRAFICA.capa.lombadaMinTextoMm,
      corte: {
        x: cap.corte.x,
        y: cap.corte.y,
        l: cap.corte.larguraMm,
        a: cap.corte.alturaMm,
      },
      cor: { cmyk: cor.cmyk, claro: cor.claro },
      titulo: conteudo.livro.titulo?.trim() ?? "",
      subtitulo: conteudo.livro.subtitulo?.trim() || null,
      autor: conteudo.livro.autor?.trim() || null,
      linhasMax: TITULO_CAPA_LINHAS,
      foto:
        foto && f
          ? {
              arquivo,
              ...caixa,
              ...enquadrarFoto(caixa, f, { x: f.foco_x, y: f.foco_y }),
            }
          : null,
      marca: MARCA,
    },
  };
}
