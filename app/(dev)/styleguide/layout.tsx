import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { styleguideLiberado } from "@/lib/dev";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Só em desenvolvimento (ou no gate de design, com ECOA_STYLEGUIDE=1).
export default function LayoutStyleguide({
  children,
}: {
  children: ReactNode;
}) {
  if (!styleguideLiberado()) notFound();
  return children;
}
