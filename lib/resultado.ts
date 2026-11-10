// Formato único de resposta das Server Actions de formulário.
export type Resultado = { ok: boolean; mensagem: string };
export type AcaoFormulario = (
  anterior: Resultado | null,
  dados: FormData,
) => Promise<Resultado | null>;
