"use client";

// Marco da 1ª história (M11): uma vez por livro e por aparelho. Contar no grupo abre o
// WhatsApp com a mensagem e o link da família; sem link ainda, leva ao convite.
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { linkWhatsApp, mensagemPrimeiraHistoria } from "@/lib/whatsapp";
import { classesDoBotao } from "./botao";

const ouvintes = new Set<() => void>();
const assinar = (aviso: () => void) => {
  ouvintes.add(aviso);
  return () => void ouvintes.delete(aviso);
};
function visto(nome: string) {
  try {
    return localStorage.getItem(nome) === "visto";
  } catch {
    return false;
  }
}

export function MarcoPrimeiraHistoria({
  livroId,
  autor,
  linkFamilia,
}: {
  livroId: string;
  autor: string;
  linkFamilia: string | null;
}) {
  const nome = `ecoa-marco-primeira-historia-${livroId}`;
  const jaViu = useSyncExternalStore(
    assinar,
    () => visto(nome),
    () => true,
  );
  if (jaViu) return null;
  const fechar = () => {
    try {
      localStorage.setItem(nome, "visto");
    } catch {}
    ouvintes.forEach((o) => o());
  };
  return (
    <section
      aria-live="polite"
      className="rounded-cartao bg-floresta text-papel flex flex-col gap-4 p-6"
    >
      <p className="font-livro text-livro-28 leading-snug">
        A primeira história do livro está pronta.
      </p>
      <p className="text-ui-17 text-papel/85">Conte para a família no grupo.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {linkFamilia ? (
          <a
            href={linkWhatsApp(
              mensagemPrimeiraHistoria({ autor, link: linkFamilia }),
            )}
            target="_blank"
            rel="noreferrer"
            onClick={fechar}
            className={
              classesDoBotao({ variante: "secundario", larguraTotal: true }) +
              " sm:w-auto"
            }
          >
            Contar no grupo
          </a>
        ) : (
          <Link
            href={`/livro/${livroId}/kit`}
            onClick={fechar}
            className={
              classesDoBotao({ variante: "secundario", larguraTotal: true }) +
              " sm:w-auto"
            }
          >
            Contar no grupo
          </Link>
        )}
        <button
          type="button"
          onClick={fechar}
          className="text-ui-17 text-papel min-h-alvo rounded-full px-4 font-medium"
        >
          Agora não
        </button>
      </div>
    </section>
  );
}
