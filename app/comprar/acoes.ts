"use server";

import { redirect } from "next/navigation";
import { COMPRA_VALIDADE_H, PRECO_PLANO } from "@/lib/config";
import { envPagamento } from "@/lib/env-pagamento";
import { urlDoApp } from "@/lib/env-servidor";
import { codigoDoErro, fraseDoErro } from "@/lib/erros-banco";
import { emailDaCompra } from "@/lib/pagamento/estado";
import { criarPreferencia } from "@/lib/pagamento/mercado-pago";
import type { Resultado } from "@/lib/resultado";
import { clienteAdmin } from "@/lib/supabase/admin";

const FORA: Resultado = {
  ok: false,
  mensagem: "Não deu para abrir o pagamento. Tente de novo.",
};

/**
 * Cria (ou reaproveita) a compra no banco, cria a cobrança no Checkout Pro e manda a pessoa
 * para o Mercado Pago (P77). O e-mail digitado vira o responsável do livro. Log sem o e-mail.
 */
export async function iniciarCompra(
  _anterior: Resultado | null,
  dados: FormData,
): Promise<Resultado> {
  const env = envPagamento();
  if (!env) return { ok: false, mensagem: "A compra abre em breve." };
  const email = emailDaCompra(String(dados.get("email") ?? ""));
  if (!email) return { ok: false, mensagem: "Confira o e-mail." };

  const db = clienteAdmin();
  const { data, error } = await db.rpc("compra_criar", { p_email: email });
  if (error || !data?.[0]) {
    if (codigoDoErro(error) === "compra_teto_email")
      return { ok: false, mensagem: fraseDoErro(error) };
    console.error("[comprar] compra_criar", { codigo: error?.code });
    return FORA;
  }
  const compra = data[0];
  // Duplo toque ou voltar e tocar de novo: a mesma cobrança, nunca duas.
  if (compra.mp_link) redirect(compra.mp_link);

  let preferencia: { id: string; link: string };
  try {
    preferencia = await criarPreferencia(env.MP_ACCESS_TOKEN, {
      compra: compra.id,
      email,
      valorCentavos: PRECO_PLANO * 100, // = privado.preco_plano_centavos() (teste)
      urlApp: urlDoApp(),
      validadeH: COMPRA_VALIDADE_H,
    });
  } catch (e) {
    console.error("[comprar] preferência", {
      compra: compra.id,
      erro: (e as Error).message,
    });
    return FORA;
  }
  const { error: erroGuardar } = await db.rpc("compra_guardar_preferencia", {
    p_compra: compra.id,
    p_preferencia: preferencia.id,
    p_link: preferencia.link,
  });
  if (erroGuardar) {
    console.error("[comprar] guardar preferência", { compra: compra.id });
    return FORA;
  }
  redirect(preferencia.link);
}
