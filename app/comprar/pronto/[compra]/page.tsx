import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { COMPRA_CONSULTA_MIN_S, COMPRA_ESPERA_MAX_MIN } from "@/lib/config";
import { mascararEmail } from "@/lib/convite/textos";
import { deveConsultarNaVolta, estadoDaTela } from "@/lib/pagamento/estado";
import { processarPagamento } from "@/lib/pagamento/processar";
import { clienteAdmin, type ClienteAdmin } from "@/lib/supabase/admin";
import { ProntoCliente } from "./pronto-cliente";

export const metadata: Metadata = {
  title: "Compra · Ecoa Memórias",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Volta do Mercado Pago (CUJ 1 a 4 e 7). O status da URL é ignorado: o payment_id só serve
// para consultar a API, e só quando pode mudar algo (deveConsultarNaVolta). O proxy põe
// no-store, noindex e no-referrer (PRIVADAS).
export default function PaginaCompraPronta({
  params,
  searchParams,
}: PageProps<"/comprar/pronto/[compra]">) {
  return (
    <Suspense>
      {Promise.all([params, searchParams]).then(([{ compra }, busca]) => (
        <Pronto
          compra={compra}
          pagamento={
            primeiro(busca.payment_id) ?? primeiro(busca.collection_id)
          }
        />
      ))}
    </Suspense>
  );
}

const primeiro = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? null;

async function ler(db: ClienteAdmin, id: string) {
  const { data, error } = await db
    .from("payments")
    .select("estado, email, mp_link, mp_pagamento_id, atualizado_em")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não deu para ler a compra.");
  return data;
}

async function Pronto({
  compra,
  pagamento,
}: {
  compra: string;
  pagamento: string | null;
}) {
  await connection();
  if (!UUID.test(compra)) notFound();
  const db = clienteAdmin();
  let linha = await ler(db, compra);
  if (!linha) notFound();
  if (
    deveConsultarNaVolta(linha, pagamento, COMPRA_CONSULTA_MIN_S) &&
    pagamento
  ) {
    await processarPagamento(pagamento, { compraEsperada: compra });
    linha = (await ler(db, compra)) ?? linha;
  }
  return (
    <ProntoCliente
      estado={estadoDaTela(linha.estado)}
      emailMascarado={mascararEmail(linha.email)}
      tentarUrl={linha.mp_link}
      esperaMaxMin={COMPRA_ESPERA_MAX_MIN}
    />
  );
}
