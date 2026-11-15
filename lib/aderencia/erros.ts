// Prompt 15: resumo de `job_falhou` e `erro_servidor` para o admin. Puro, só ids e contagens.
export type EventoDeErro = {
  criado_em: string;
  book_id: string | null;
  acao: string;
  detalhes: unknown;
};

export type JobFalhou = {
  quando: string;
  funcao: string;
  runId: string;
  livroId: string | null;
};

export type ErroPorRota = {
  rota: string;
  ultimas24h: number;
  ultimos7d: number;
  ultimo: string;
  tipo: string;
};

const DIA_MS = 24 * 3600_000;

const texto = (d: unknown, chave: string): string => {
  if (typeof d !== "object" || d === null) return "";
  const v = (d as Record<string, unknown>)[chave];
  return typeof v === "string" ? v : "";
};

export function jobsQueFalharam(eventos: readonly EventoDeErro[]): JobFalhou[] {
  return eventos
    .filter((e) => e.acao === "job_falhou")
    .map((e) => ({
      quando: e.criado_em,
      funcao: texto(e.detalhes, "funcao") || "(sem nome)",
      runId: texto(e.detalhes, "run_id"),
      livroId: e.book_id,
    }))
    .sort((a, b) => b.quando.localeCompare(a.quando));
}

/** Erros do servidor por rota, do que mais errou nas últimas 24 h para o que menos. */
export function errosPorRota(
  eventos: readonly EventoDeErro[],
  agora: Date,
): ErroPorRota[] {
  const mapa = new Map<string, ErroPorRota>();
  for (const e of eventos) {
    if (e.acao !== "erro_servidor") continue;
    const idade = agora.getTime() - Date.parse(e.criado_em);
    const rota = texto(e.detalhes, "rota") || "desconhecida";
    const r = mapa.get(rota) ?? {
      rota,
      ultimas24h: 0,
      ultimos7d: 0,
      ultimo: e.criado_em,
      tipo: texto(e.detalhes, "tipo") || "Error",
    };
    if (idade <= DIA_MS) r.ultimas24h++;
    if (idade <= 7 * DIA_MS) r.ultimos7d++;
    if (e.criado_em > r.ultimo) {
      r.ultimo = e.criado_em;
      r.tipo = texto(e.detalhes, "tipo") || r.tipo;
    }
    mapa.set(rota, r);
  }
  return [...mapa.values()].sort(
    (a, b) => b.ultimas24h - a.ultimas24h || b.ultimo.localeCompare(a.ultimo),
  );
}
