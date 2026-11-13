"use client";

// Dica de primeira vez (M11): uma linha com "Entendi", mostrada uma única vez por tela e por
// aparelho. Só para gestos não óbvios. Sem localStorage (aba privada), aparece sempre.
import { useSyncExternalStore } from "react";

const ouvintes = new Set<() => void>();

function vista(nome: string) {
  try {
    return localStorage.getItem(nome) === "vista";
  } catch {
    return false;
  }
}

function assinar(aviso: () => void) {
  ouvintes.add(aviso);
  return () => void ouvintes.delete(aviso);
}

export function DicaPrimeiraVez({
  chave,
  children,
}: {
  chave: string;
  children: React.ReactNode;
}) {
  const nome = `ecoa-dica-${chave}`;
  // No servidor, escondida: nada pisca para quem já viu.
  const jaViu = useSyncExternalStore(
    assinar,
    () => vista(nome),
    () => true,
  );
  if (jaViu) return null;
  return (
    <div className="bg-polen-2 text-ui-15 text-tinta flex items-center justify-between gap-3 rounded-2xl py-2 pr-2 pl-4">
      <p>{children}</p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(nome, "vista");
          } catch {}
          ouvintes.forEach((o) => o());
        }}
        className="text-floresta min-h-11 shrink-0 rounded-full px-3 font-medium"
      >
        Entendi
      </button>
    </div>
  );
}
