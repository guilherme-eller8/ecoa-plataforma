// Prompt 15: erros do servidor viram `erro_servidor` em events. Só o padrão da rota, o tipo e o
// digest do Next: nunca a mensagem, a URL, os cabeçalhos nem o token (T36). Parte pura, testada.

/** `/app/a/[token]/page` → `/a/[token]`. Rota fora do formato esperado vira "desconhecida". */
export function rotaSegura(routePath: unknown): string {
  if (typeof routePath !== "string") return "desconhecida";
  const limpa = routePath
    .replace(/^\/app(?=\/)/, "")
    .replace(/\/(page|route|layout)$/, "");
  // Só segmentos fixos ou [param]; um token cru (ou qualquer valor) nunca passa.
  if (!/^(\/(\[\.{0,3}[A-Za-z_]+\]|[a-z0-9_()-]+))+$|^\/$/.test(limpa))
    return "desconhecida";
  return limpa.slice(0, 64);
}

export function digestSeguro(erro: unknown): string {
  const d =
    typeof erro === "object" && erro !== null && "digest" in erro
      ? String((erro as { digest: unknown }).digest)
      : "";
  return /^[A-Za-z0-9_-]{1,32}$/.test(d) ? d : "";
}

export function tipoDoErro(erro: unknown): string {
  const nome = erro instanceof Error ? erro.name : "";
  return /^[A-Za-z0-9_]{1,40}$/.test(nome) ? nome : "Error";
}

/** No máximo 1 registro por rota por minuto, em cada instância. */
export function criarLimitador(
  janelaMs = 60_000,
  agora: () => number = Date.now,
) {
  const ultimo = new Map<string, number>();
  return (chave: string): boolean => {
    const t = agora();
    const antes = ultimo.get(chave);
    if (antes !== undefined && t - antes < janelaMs) return false;
    if (ultimo.size > 500) ultimo.clear();
    ultimo.set(chave, t);
    return true;
  };
}
