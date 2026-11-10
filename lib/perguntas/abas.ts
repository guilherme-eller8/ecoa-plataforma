// Abas da tela Perguntas. Fica fora do componente ("use client") porque a página do servidor
// também precisa do array: importado de um módulo de cliente, ele chega como referência, não
// como valor (foi o que quebrou /livro/[id]/perguntas).
export const ABAS = [
  "perguntar",
  "enviadas",
  "respondidas",
  "causos",
  "enquete",
] as const;
export type AbaPerguntas = (typeof ABAS)[number];

export function ehAba(valor: unknown): valor is AbaPerguntas {
  return (ABAS as readonly unknown[]).includes(valor);
}
