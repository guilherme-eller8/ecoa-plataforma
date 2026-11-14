import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { TelaPlayer } from "@/components/telas/tela-player";
import { abrirQr } from "@/lib/qr/player";
import * as acoes from "./acoes";

export const metadata: Metadata = {
  title: "Ouvir · Ecoa Memórias",
  robots: { index: false, follow: false },
};

// Player do QR (prompt 10). Toda consulta passa pelo limite do banco; a URL do áudio é
// assinada por 10 min e a página nunca fica em cache (proxy e next.config).
export default function PaginaPlayer({ params }: PageProps<"/ouvir/[codigo]">) {
  return (
    <Suspense>
      {params.then(({ codigo }) => (
        <Player codigo={codigo} />
      ))}
    </Suspense>
  );
}

async function Player({ codigo }: { codigo: string }) {
  await connection(); // a chave de rede usa a data de hoje: nunca no pré-render
  const estado = await abrirQr(codigo.toUpperCase(), await headers());
  return (
    <TelaPlayer
      estado={estado}
      tocou={acoes.tocou.bind(null, codigo.toUpperCase())}
    />
  );
}
