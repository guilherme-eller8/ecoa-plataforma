// Evals 1A: quando avisar o admin por e-mail. Puro (sem banco): recebe a foto do momento,
// já somada pelo banco, e devolve os alertas. Só ids curtos e números, nunca nome nem texto.
import { emReais, formatarReais } from "@/lib/ai/custo";
import {
  ALERTA_GASTO_DIA_BRL,
  ALERTA_GASTO_LIVRO_BRL,
  ALERTA_PERDA_FALHAS,
  ALERTA_ERROS_JANELA_MIN,
  ALERTA_PERDA_GASTO_MIN_BRL,
  MAX_MINUTOS_IA_DIA,
  MAX_PROPOSTAS_DIA,
} from "@/lib/config";

export const CONDICOES = [
  "fila_parada",
  "gasto_dia",
  "gasto_livro",
  "perda",
  "cota",
  "erros_servidor",
] as const;
export type Condicao = (typeof CONDICOES)[number];

export type FotoDosAlertas = {
  /** Gravações que a varredura já reenviou e continuam sem história. */
  filaParada: { id: string; book_id: string; esperaMin: number }[];
  gastoHojeUSD: number;
  /** Livros acima do teto acumulado, com o gasto de hoje (para avisar só no dia em que passou). */
  livrosNoTeto: { book_id: string; totalUSD: number; hojeUSD: number }[];
  semana: { gastoUSD: number; perdaUSD: number };
  /** Livros em ALERTA_COTA_FRACAO ou mais do teto diário de IA (admin_cotas_24h). */
  cotas: { book_id: string; pedidos: number; minutos: number }[];
  /** T56: erro_servidor na janela do ciclo, por rota-padrão (nunca a URL com token). */
  errosServidor: { rota: string; n: number }[];
};

export type Alerta = {
  condicao: Condicao;
  livro: string | null;
  titulo: string;
  linhas: string[];
};

const curto = (id: string) => id.slice(0, 8);
const pct = (f: number) => `${Math.round(f * 100)}%`;

export function alertasDe(f: FotoDosAlertas): Alerta[] {
  const alertas: Alerta[] = [];

  if (f.filaParada.length) {
    const maior = Math.max(...f.filaParada.map((g) => g.esperaMin));
    alertas.push({
      condicao: "fila_parada",
      livro: null,
      titulo: "Fila parada: gravação esperando sem virar história",
      linhas: [
        `${f.filaParada.length} gravação(ões) esperando; a mais antiga há ${Math.round(maior)} min.`,
        "A varredura já reenviou e nada começou. Confira o sync do Inngest.",
        ...f.filaParada
          .slice(0, 10)
          .map((g) => `Gravação ${curto(g.id)} · livro ${curto(g.book_id)}`),
      ],
    });
  }

  const hoje = emReais(f.gastoHojeUSD);
  if (hoje > ALERTA_GASTO_DIA_BRL)
    alertas.push({
      condicao: "gasto_dia",
      livro: null,
      titulo: `Gasto de IA hoje: ${formatarReais(hoje)}`,
      linhas: [`Passou de ${formatarReais(ALERTA_GASTO_DIA_BRL)} no dia.`],
    });

  for (const l of f.livrosNoTeto) {
    const total = emReais(l.totalUSD);
    const antes = emReais(l.totalUSD - l.hojeUSD);
    // Só no dia em que passou do teto; depois disso, a tela mostra.
    if (total > ALERTA_GASTO_LIVRO_BRL && antes <= ALERTA_GASTO_LIVRO_BRL)
      alertas.push({
        condicao: "gasto_livro",
        livro: l.book_id,
        titulo: `Livro ${curto(l.book_id)} passou de ${formatarReais(ALERTA_GASTO_LIVRO_BRL)} em IA`,
        linhas: [
          `Acumulado: ${formatarReais(total)} (hoje: ${formatarReais(emReais(l.hojeUSD))}).`,
        ],
      });
  }

  const gastoSemana = emReais(f.semana.gastoUSD);
  if (gastoSemana >= ALERTA_PERDA_GASTO_MIN_BRL) {
    const fracao = f.semana.perdaUSD / f.semana.gastoUSD;
    if (fracao > ALERTA_PERDA_FALHAS)
      alertas.push({
        condicao: "perda",
        livro: null,
        titulo: `Falhas custaram ${pct(fracao)} do gasto da semana`,
        linhas: [
          `${formatarReais(emReais(f.semana.perdaUSD))} de ${formatarReais(gastoSemana)} nos últimos 7 dias (limite: ${pct(ALERTA_PERDA_FALHAS)}).`,
        ],
      });
  }

  for (const c of f.cotas)
    alertas.push({
      condicao: "cota",
      livro: c.book_id,
      titulo: `Livro ${curto(c.book_id)} perto do teto diário de IA`,
      linhas: [
        `Pedidos em 24 h: ${c.pedidos} de ${MAX_PROPOSTAS_DIA}.`,
        `Áudio processado em 24 h: ${Math.round(c.minutos)} de ${MAX_MINUTOS_IA_DIA} min.`,
      ],
    });

  if (f.errosServidor.length) {
    const total = f.errosServidor.reduce((t, e) => t + e.n, 0);
    alertas.push({
      condicao: "erros_servidor",
      livro: null,
      titulo: `Erro no servidor: ${total} nos últimos ${ALERTA_ERROS_JANELA_MIN} min`,
      linhas: [
        ...f.errosServidor.slice(0, 10).map((e) => `${e.rota}: ${e.n}`),
        "A lista completa fica em Erros, no admin. Chega no máximo 1 aviso por dia.",
      ],
    });
  }

  return alertas;
}

/** Chave do Resend (vale 24 h): no máximo 1 aviso por condição, livro, dia e admin. */
export function chaveDoAlerta(a: Alerta, dia: string, admin: string): string {
  return `alerta:${a.condicao}:${a.livro ?? "todos"}:${dia}:${admin}`;
}
