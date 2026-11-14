// Configuração inicial em 3 passos. Cada passo fica "feito", "pulado" ou "depois";
// sem estado, ainda não foi visto. O 4º, "ajuda" (Quem mais ajuda, prompt 11), é só do
// responsável e só em livro novo: PASSOS continua com 3 para não reabrir a configuração de
// quem já passou por ela.

export const PASSOS = ["quem", "perguntas", "fotos"] as const;
export type PassoBase = (typeof PASSOS)[number];
export type Passo = PassoBase | "ajuda";
export type EstadoPasso = "feito" | "pulado" | "depois";
export type Configuracao = Partial<Record<Passo, EstadoPasso>>;
type Papel = "responsavel" | "cofacilitador";

const TODOS: readonly Passo[] = [...PASSOS, "ajuda"];

const ESTADOS: readonly EstadoPasso[] = ["feito", "pulado", "depois"];

/** Lê o jsonb do banco com segurança: o que não for conhecido é ignorado. */
export function lerConfiguracao(json: unknown): Configuracao {
  const cfg: Configuracao = {};
  if (json && typeof json === "object" && !Array.isArray(json)) {
    for (const p of TODOS) {
      const v = (json as Record<string, unknown>)[p];
      if (ESTADOS.includes(v as EstadoPasso)) cfg[p] = v as EstadoPasso;
    }
  }
  return cfg;
}

export function ehPasso(p: string): p is Passo {
  return (TODOS as readonly string[]).includes(p);
}

/**
 * Livro novo = ainda não passou pelas fotos (ou já viu o passo ajuda). Só o responsável
 * convida, então só ele vê o passo.
 */
export function temPassoAjuda(papel: Papel, cfg: Configuracao): boolean {
  return papel === "responsavel" && (!cfg.fotos || cfg.ajuda !== undefined);
}

/** Os passos que esta pessoa percorre, na ordem. */
export function passosDoPapel(papel: Papel, cfg: Configuracao): Passo[] {
  return temPassoAjuda(papel, cfg) ? [...TODOS] : [...PASSOS];
}

/** Só na primeira entrada (nada visto) e com o plano ativo a pessoa é levada ao passo 1. */
export function precisaConfigurar(
  cfg: Configuracao,
  podeEscrever: boolean,
): boolean {
  return podeEscrever && PASSOS.every((p) => !cfg[p]);
}

/** Passos "depois" e os sem estado, na ordem: o cartão da home mostra o primeiro. */
export function pendentes(cfg: Configuracao, papel: Papel = "responsavel"): Passo[] {
  const base: Passo[] = PASSOS.filter((p) => !cfg[p] || cfg[p] === "depois");
  return papel === "responsavel" && cfg.ajuda === "depois"
    ? [...base, "ajuda"]
    : base;
}

/** O passo seguinte a `passo`, ou null no fim (vai para o kit). */
export function proximoPasso(
  passo: Passo,
  passos: readonly Passo[] = PASSOS,
): Passo | null {
  const i = passos.indexOf(passo);
  return i < 0 ? null : (passos[i + 1] ?? null);
}

export function marcar(
  cfg: Configuracao,
  passo: Passo,
  estado: EstadoPasso,
): Configuracao {
  return { ...cfg, [passo]: estado };
}
