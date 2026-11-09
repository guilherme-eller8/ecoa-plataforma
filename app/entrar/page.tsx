import type { Metadata } from "next";
import { Suspense } from "react";
import { EntrarCliente } from "./entrar-cliente";

export const metadata: Metadata = { title: "Entrar · Ecoa Memórias" };

export default function PaginaEntrar() {
  return (
    <Suspense>
      <EntrarCliente />
    </Suspense>
  );
}
