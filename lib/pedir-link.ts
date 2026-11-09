import { z } from "zod";
import type { Resultado } from "@/lib/resultado";

export const MENSAGEM_LINK =
  "Se este e-mail tiver um livro, o link chega em instantes.";

/** Valida o pedido de link. A resposta é a mesma para qualquer e-mail válido, tenha ele livro ou não. */
export function prepararPedidoDeLink(dados: FormData): {
  email: string | null;
  resultado: Resultado;
} {
  const email = z.email().safeParse(
    String(dados.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!email.success)
    return {
      email: null,
      resultado: { ok: false, mensagem: "Confira o e-mail digitado." },
    };
  return {
    email: email.data,
    resultado: { ok: true, mensagem: MENSAGEM_LINK },
  };
}
