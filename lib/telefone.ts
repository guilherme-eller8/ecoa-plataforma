// Celular do autor: o que a pessoa digita ("(31) 99999-8888") vira formato internacional
// ("+5531999998888"), o mesmo que o banco aceita e que o wa.me usa (sem o "+").

/** null = vazio; undefined = inválido. */
export function normalizarCelular(entrada: string): string | null | undefined {
  const digitos = entrada.replace(/\D/g, "");
  if (!digitos) return null;
  if (entrada.trim().startsWith("+"))
    return /^[1-9][0-9]{9,14}$/.test(digitos) ? `+${digitos}` : undefined;
  if (digitos.length === 10 || digitos.length === 11) return `+55${digitos}`; // DDD + número
  if (
    (digitos.length === 12 || digitos.length === 13) &&
    digitos.startsWith("55")
  )
    return `+${digitos}`;
  return undefined;
}

/** "+5531999998888" → "(31) 99999-8888"; outros países ficam como estão. */
export function formatarCelular(celular: string | null): string {
  if (!celular) return "";
  const m = celular.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : celular;
}
