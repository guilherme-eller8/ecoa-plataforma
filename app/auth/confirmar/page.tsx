import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaConfirmar } from "@/components/telas/tela-confirmar";
import { confirmar } from "./acoes";

export const metadata: Metadata = { title: "Entrar · Ecoa Memórias" };

export default function PaginaConfirmar({
  searchParams,
}: PageProps<"/auth/confirmar">) {
  return (
    <Suspense>
      {searchParams.then((params) => {
        const token =
          typeof params.token_hash === "string" ? params.token_hash : null;
        return <TelaConfirmar tokenHash={token} confirmar={confirmar} />;
      })}
    </Suspense>
  );
}
