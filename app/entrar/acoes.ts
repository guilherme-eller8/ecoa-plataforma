"use server";

import { enviarLinkDeEntrada } from "@/lib/entrar/link";
import { prepararPedidoDeLink } from "@/lib/pedir-link";
import type { Resultado } from "@/lib/resultado";

/** Link de entrada por e-mail. A resposta é a mesma para qualquer e-mail válido. */
export async function pedirLink(
  _anterior: Resultado | null,
  dados: FormData,
): Promise<Resultado> {
  const { email, resultado } = prepararPedidoDeLink(dados);
  if (!email) return resultado;
  await enviarLinkDeEntrada(email);
  return resultado;
}
