import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaEvals } from "@/components/telas/tela-evals";
import { carregarCusto } from "@/lib/evals/dados";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = {
  title: "Evals · Admin · Ecoa Memórias",
  robots: { index: false },
};

export default function PaginaEvals() {
  return (
    <Suspense>
      <Evals />
    </Suspense>
  );
}

// O proxy.ts já devolve 404 para quem não é admin; aqui confere de novo antes da chave secreta.
async function Evals() {
  const usuario = await usuarioAtual();
  if (!usuario?.ehAdmin) notFound();
  return <TelaEvals dados={await carregarCusto()} />;
}
