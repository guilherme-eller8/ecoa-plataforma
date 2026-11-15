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
import { caixaDaFoto } from "./fotos";
import {
  corDaCapa,
  paragrafosDaMensagem,
  saiComQr,
  soIncluidas,
  type ConteudoDoLivro,
} from "./montagem";
import { matrizDoQr, type QrParaTypst } from "./qr-matriz";

export type FotoParaTypst = {
  arquivo: string;
  larguraMm: number;
  alturaMm: number;
};
export type FotoPedida = {
  arquivo: string; // nome local no Typst: nunca o caminho do Storage
  bucket: "acervo" | "mensagens";
  caminho: string;
  larguraMm: number;
  alturaMm: number;
  largura: number | null; // pixels do original (do banco)
  altura: number | null;
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
    dim: { largura: number | null; altura: number | null },
    caixa: { larguraMm: number; alturaMm: number },
  ): FotoParaTypst => {
    fotos.push({ arquivo, bucket, caminho, ...caixa, ...dim });
    return { arquivo, ...caixa };
  };

  const historias = c.historias.map((h, i) => ({
    titulo: h.titulo?.trim() ?? "",
    ano: h.ano,
    paragrafos: h.paragrafos,
    fotos: h.fotos.map((f, j) =>
      pedir(
        `foto-h${i + 1}-${j + 1}.jpg`,
        "acervo",
        f.caminho,
        f,
        caixaDaFoto(f),
      ),
    ),
    qr: qrDoTypst(h, opcoes.maiuscula),
  }));
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
  foto: FotoParaTypst | null;
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
      foto: foto ? { arquivo, ...caixa } : null,
      marca: MARCA,
    },
  };
}
