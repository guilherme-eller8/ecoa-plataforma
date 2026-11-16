// Alertas da tela Conferir (design 5.1). Vermelho bloqueia o Publicar; amarelo só avisa.
// Páginas não são alerta nem bloqueio (Q16): ficam em `resumoDePaginas`.
import {
  HISTORIA_CURTA_PALAVRAS,
  PAGINAS_INCLUSAS,
  VALOR_PAGINA_EXTRA,
} from "@/lib/config";
import { paginasExtras } from "./espec";
import { fotoPequenaParaImprimir } from "./fotos";
import { soIncluidas, vaiComQr, type ConteudoDoLivro } from "./montagem";

export type Alerta = {
  nivel: "vermelho" | "amarelo";
  codigo:
    | "livro_vazio"
    | "livro_sem_titulo"
    | "historia_sem_titulo"
    | "historia_nao_pronta"
    | "titulo_capa_longo"
    | "foto_pequena"
    | "historia_curta"
    | "historia_sem_qr"
    | "mensagem_sem_qr";
  texto: string;
  /** Onde resolver: o passo da montagem e, se houver, o item. */
  onde: "conteudo" | "capa" | "mensagens" | "historia";
  item?: string;
};

export function alertasDoLivro(
  conteudo: ConteudoDoLivro,
  opcoes: { tituloCapaLinhas?: number | null; linhasMax?: number } = {},
): Alerta[] {
  const c = soIncluidas(conteudo);
  const linhasMax = opcoes.linhasMax ?? 3;
  const vermelhos: Alerta[] = [];
  const amarelos: Alerta[] = [];

  if (c.historias.length === 0 && c.mensagens.length === 0) {
    vermelhos.push({
      nivel: "vermelho",
      codigo: "livro_vazio",
      texto: "O livro está vazio. Ponha uma história ou mensagem.",
      onde: "conteudo",
    });
  }
  if (!c.livro.titulo?.trim()) {
    vermelhos.push({
      nivel: "vermelho",
      codigo: "livro_sem_titulo",
      texto: "O livro está sem título.",
      onde: "capa",
    });
  } else if ((opcoes.tituloCapaLinhas ?? 0) > linhasMax) {
    vermelhos.push({
      nivel: "vermelho",
      codigo: "titulo_capa_longo",
      texto: `O título não cabe na capa em ${linhasMax} linhas. Encurte.`,
      onde: "capa",
    });
  }

  for (const h of c.historias) {
    const nome = h.titulo?.trim() || "História sem título";
    if (!h.titulo?.trim()) {
      vermelhos.push({
        nivel: "vermelho",
        codigo: "historia_sem_titulo",
        texto: "Uma história está sem título.",
        onde: "historia",
        item: h.id,
      });
    }
    if (!h.revisada) {
      vermelhos.push({
        nivel: "vermelho",
        codigo: "historia_nao_pronta",
        texto: `“${nome}”: falta revisar. Marque como pronta ou tire do livro.`,
        onde: "historia",
        item: h.id,
      });
    }
    if (h.fotos.some((f, i) => fotoPequenaParaImprimir(f, i === 0))) {
      amarelos.push({
        nivel: "amarelo",
        codigo: "foto_pequena",
        texto: `“${nome}”: uma foto é pequena e pode sair borrada.`,
        onde: "historia",
        item: h.id,
      });
    }
    if (h.palavras < HISTORIA_CURTA_PALAVRAS) {
      amarelos.push({
        nivel: "amarelo",
        codigo: "historia_curta",
        texto: `“${nome}” é bem curta.`,
        onde: "historia",
        item: h.id,
      });
    }
    if (!vaiComQr(h)) {
      amarelos.push({
        nivel: "amarelo",
        codigo: "historia_sem_qr",
        texto: `“${nome}” sai sem QR: não tem a voz para tocar.`,
        onde: "historia",
        item: h.id,
      });
    }
  }
  for (const m of c.mensagens) {
    if (!vaiComQr(m)) {
      amarelos.push({
        nivel: "amarelo",
        codigo: "mensagem_sem_qr",
        texto: `A mensagem de ${m.nome} sai sem QR: foi só escrita.`,
        onde: "mensagens",
        item: m.id,
      });
    }
  }
  return [...vermelhos, ...amarelos];
}

export function bloqueia(alertas: Alerta[]): boolean {
  return alertas.some((a) => a.nivel === "vermelho");
}

/** "92 páginas. O plano inclui 80; as 12 a mais entram no orçamento da gráfica." (Q16) */
export function resumoDePaginas(paginas: number): {
  titulo: string;
  frase: string;
  extras: number;
} {
  const extras = paginasExtras(paginas);
  const titulo = `${paginas} páginas`;
  if (extras === 0) {
    return {
      titulo,
      extras,
      frase: `Cabe no plano (${PAGINAS_INCLUSAS} páginas).`,
    };
  }
  const valor =
    VALOR_PAGINA_EXTRA == null
      ? ""
      : ` Cerca de R$ ${(extras * VALOR_PAGINA_EXTRA).toLocaleString("pt-BR")}.`;
  return {
    titulo,
    extras,
    frase: `O plano inclui ${PAGINAS_INCLUSAS}; as ${extras} a mais entram no orçamento da gráfica.${valor}`,
  };
}
