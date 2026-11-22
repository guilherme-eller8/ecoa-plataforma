"use client";

// Oferta de "pôr na tela inicial" para quem acabou de aceitar o convite: voltar a gravar vira
// tocar no ícone, com a sessão salva. Uma vez por aparelho; some se já abriu pelo ícone ou se o
// navegador não sabe instalar (computador, por exemplo).
import { useSyncExternalStore } from "react";
import {
  assinarInstalacao,
  ehIos,
  instalar,
  jaInstalado,
  podeInstalar,
} from "@/lib/pwa/instalar";

const CHAVE = "ecoa-dica-tela-inicial";
const ouvintes = new Set<() => void>();

function assinar(aviso: () => void) {
  ouvintes.add(aviso);
  const sair = assinarInstalacao(aviso);
  return () => {
    ouvintes.delete(aviso);
    sair();
  };
}

function dispensada() {
  try {
    return localStorage.getItem(CHAVE) === "vista";
  } catch {
    return false;
  }
}

function dispensar() {
  try {
    localStorage.setItem(CHAVE, "vista");
  } catch {}
  ouvintes.forEach((o) => o());
}

type Modo = "nada" | "android" | "ios";

function modoAgora(): Modo {
  if (dispensada() || jaInstalado()) return "nada";
  if (podeInstalar()) return "android";
  if (ehIos()) return "ios";
  return "nada";
}

export function PorNaTelaInicial() {
  // No servidor, nada: não pisca para quem já viu.
  const modo = useSyncExternalStore(assinar, modoAgora, () => "nada" as Modo);
  if (modo === "nada") return null;
  return (
    <div className="bg-polen-2 text-ui-15 text-tinta flex flex-col gap-2 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p>
        {modo === "ios"
          ? "Para voltar com 1 toque: Compartilhar e depois Adicionar à Tela de Início."
          : "Para voltar a gravar com 1 toque, ponha o Ecoa na tela inicial."}
      </p>
      <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
        {modo === "android" ? (
          <>
            <button
              type="button"
              onClick={dispensar}
              className="text-tinta-2 min-h-11 rounded-full px-3"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={() => void instalar().finally(dispensar)}
              className="text-floresta min-h-11 rounded-full px-3 font-medium"
            >
              Pôr na tela inicial
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={dispensar}
            className="text-floresta min-h-11 rounded-full px-3 font-medium"
          >
            Entendi
          </button>
        )}
      </div>
    </div>
  );
}
