import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaErros } from "@/components/telas/tela-erros";
import { carregarErros } from "@/lib/aderencia/dados";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = {
  title: "Erros · Admin · Ecoa Memórias",
  robots: { index: false },
};

export default function PaginaErros() {
  return (
    <Suspense>
      <Erros />
    </Suspense>
  );
}

async function Erros() {
  const usuario = await usuarioAtual();
  if (!usuario?.ehAdmin) notFound();
  const { jobs, rotas } = await carregarErros();
  return <TelaErros jobs={jobs} rotas={rotas} />;
}
