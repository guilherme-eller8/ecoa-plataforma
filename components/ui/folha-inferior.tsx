"use client";

// Folha inferior: no celular sobe da base da tela; a partir de 768px vira uma
// janela centralizada. Usa <dialog> nativo: Esc fecha, o foco fica preso dentro.
import { useEffect, useRef, type ReactNode } from "react";
import { IconeFechar } from "./icones";

type Props = {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
};

export function FolhaInferior({ aberta, aoFechar, titulo, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);

  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onClose={aoFechar}
      onClick={(e) => {
        // Toque fora da folha (no fundo escurecido) fecha.
        if (e.target === e.currentTarget) aoFechar();
      }}
      className={
        "rounded-t-cartao bg-papel text-tinta shadow-flutuante m-0 mt-auto max-h-[85dvh] w-full max-w-none p-0 " +
        "backdrop:bg-tinta/40 open:animate-surgir " +
        "md:rounded-cartao md:m-auto md:max-w-lg"
      }
    >
      <div className="flex flex-col gap-6 px-5 pt-3 pb-8 md:px-8 md:pt-6">
        <div
          aria-hidden="true"
          className="rounded-controle bg-linha-forte mx-auto h-1 w-10 md:hidden"
        />
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-livro text-livro-28 text-tinta">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="size-alvo rounded-controle text-tinta-2 hover:bg-polen-2 hover:text-tinta -mt-1 -mr-2 inline-flex shrink-0 items-center justify-center"
          >
            <IconeFechar tamanho={22} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
