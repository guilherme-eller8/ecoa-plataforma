import type { Metadata } from "next";
import { TelaDigitarCodigo } from "@/components/telas/tela-player";

export const metadata: Metadata = {
  title: "Ouvir · Ecoa Memórias",
  robots: { index: false, follow: false },
};

// Raiz de ouvir.ecoa-memorias.com.br: o campo para o código impresso embaixo do QR (P57).
export default function PaginaOuvir() {
  return <TelaDigitarCodigo />;
}
