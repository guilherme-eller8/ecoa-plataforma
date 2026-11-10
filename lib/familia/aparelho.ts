// Cookie que identifica o aparelho no link da família (um conjunto de votos por aparelho).
// O banco guarda só sha256("aparelho:" + livro + ":" + valor). É a regra da tela, não uma
// defesa: o limite real fica no banco (votantes por enquete e trocas por hora).
export const COOKIE_APARELHO = "ecoa_aparelho";
export const APARELHO_DURA_S = 400 * 24 * 60 * 60;

export function aparelhoValido(valor: string | undefined): valor is string {
  return typeof valor === "string" && /^[0-9a-f-]{36}$/.test(valor);
}
