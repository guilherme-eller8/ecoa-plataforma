import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaEvalsAdocao } from "@/components/telas/tela-evals-adocao";
import { carregarAdocao } from "@/lib/evals/dados";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = {
  title: "Adoção · Evals · Admin · Ecoa Memórias",
  robots: { index: false },
};

export default function PaginaAdocao() {
  return (
    <Suspense>
      <Adocao />
    </Suspense>
  );
}

// O proxy.ts já devolve 404 para quem não é admin; aqui confere de novo antes da chave secreta.
async function Adocao() {
  const usuario = await usuarioAtual();
  if (!usuario?.ehAdmin) notFound();
  return <TelaEvalsAdocao dados={await carregarAdocao()} />;
}
