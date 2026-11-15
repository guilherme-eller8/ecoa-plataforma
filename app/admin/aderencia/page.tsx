import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaAderencia } from "@/components/telas/tela-aderencia";
import { carregarAderencia } from "@/lib/aderencia/dados";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = {
  title: "Aderência · Admin · Ecoa Memórias",
  robots: { index: false },
};

export default function PaginaAderencia() {
  return (
    <Suspense>
      <Aderencia />
    </Suspense>
  );
}

// O proxy.ts já devolve 404 para quem não é admin; aqui confere de novo antes da chave secreta.
async function Aderencia() {
  const usuario = await usuarioAtual();
  if (!usuario?.ehAdmin) notFound();
  const { linhas, funil, truncado } = await carregarAderencia();
  return <TelaAderencia linhas={linhas} funil={funil} truncado={truncado} />;
}
