import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { TelaCompartilhada } from "@/components/telas/tela-compartilhada";
import { lerCompartilhada } from "@/lib/compartilhar/servidor";
import * as acoes from "./acoes";

// A prévia do WhatsApp mostra só "Uma história" (Q11): nada do título nem do texto na metadata.
export const metadata: Metadata = {
  title: "Uma história · Ecoa Memórias",
  robots: { index: false, follow: false },
  openGraph: { title: "Uma história", description: "Ecoa Memórias" },
};

// /o/{token} (prompt 11): página dinâmica, sem sessão. Desligar o link vale na hora (o proxy
// põe no-store, noindex e no-referrer).
export default function PaginaCompartilhada({
  params,
}: PageProps<"/o/[token]">) {
  return (
    <Suspense>
      {params.then(({ token }) => (
        <Compartilhada token={token} />
      ))}
    </Suspense>
  );
}

async function Compartilhada({ token }: { token: string }) {
  await connection();
  const estado = await lerCompartilhada(token);
  return (
    <TelaCompartilhada estado={estado} tocou={acoes.tocou.bind(null, token)} />
  );
}
