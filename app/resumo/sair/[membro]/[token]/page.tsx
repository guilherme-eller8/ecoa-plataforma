import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaSairResumo } from "@/components/telas/tela-sair-resumo";
import { linkDeSairValido } from "@/lib/resumo/sair";
import { sairDoResumo } from "./acoes";

export const metadata: Metadata = {
  title: "Resumo semanal · Ecoa Memórias",
  robots: { index: false, follow: false },
};

export default function PaginaSairResumo({
  params,
}: PageProps<"/resumo/sair/[membro]/[token]">) {
  return (
    <Suspense>
      {params.then(({ membro, token }) => (
        <TelaSairResumo
          valido={linkDeSairValido(membro, token)}
          sair={sairDoResumo.bind(null, membro, token)}
        />
      ))}
    </Suspense>
  );
}
