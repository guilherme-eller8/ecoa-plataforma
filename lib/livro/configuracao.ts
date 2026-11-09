// Configuração inicial em 3 passos. Cada passo fica "feito", "pulado" ou "depois";
// sem estado, ainda não foi visto.

export const PASSOS = ["quem", "perguntas", "fotos"] as const;
export type Passo = (typeof PASSOS)[number];
export type EstadoPasso = "feito" | "pulado" | "depois";
export type Configuracao = Partial<Record<Passo, EstadoPasso>>;

const ESTADOS: readonly EstadoPasso[] = ["feito", "pulado", "depois"];

/** Lê o jsonb do banco com segurança: o que não for conhecido é ignorado. */
export function lerConfiguracao(json: unknown): Configuracao {
  const cfg: Configuracao = {};
  if (json && typeof json === "object" && !Array.isArray(json)) {
    for (const p of PASSOS) {
      const v = (json as Record<string, unknown>)[p];
      if (ESTADOS.includes(v as EstadoPasso)) cfg[p] = v as EstadoPasso;
    }
  }
  return cfg;
}

export function ehPasso(p: string): p is Passo {
  return (PASSOS as readonly string[]).includes(p);
}

/** Só na primeira entrada (nada visto) e com o plano ativo a pessoa é levada ao passo 1. */
export function precisaConfigurar(
  cfg: Configuracao,
  podeEscrever: boolean,
): boolean {
  return podeEscrever && PASSOS.every((p) => !cfg[p]);
}

/** Passos "depois" e os sem estado, na ordem: o cartão da home mostra o primeiro. */
export function pendentes(cfg: Configuracao): Passo[] {
  return PASSOS.filter((p) => !cfg[p] || cfg[p] === "depois");
}

/** O passo seguinte a `passo`, ou null no fim (vai para o kit). */
export function proximoPasso(passo: Passo): Passo | null {
  return PASSOS[PASSOS.indexOf(passo) + 1] ?? null;
}

export function marcar(
  cfg: Configuracao,
  passo: Passo,
  estado: EstadoPasso,
): Configuracao {
  return { ...cfg, [passo]: estado };
}
