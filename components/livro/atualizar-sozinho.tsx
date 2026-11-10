"use client";

// "Ao vivo" sem Realtime: pede ao servidor a tela de novo a cada poucos segundos, só com
// a página visível e enquanto `ativo`. Para quando algo está tocando (pausado).
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ATUALIZAR_A_CADA_S } from "@/lib/config";

export function AtualizarSozinho({
  ativo,
  pausado = false,
}: {
  ativo: boolean;
  pausado?: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!ativo || pausado) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, ATUALIZAR_A_CADA_S * 1000);
    return () => window.clearInterval(id);
  }, [ativo, pausado, router]);
  return null;
}
