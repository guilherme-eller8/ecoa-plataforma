// Estado vazio que ensina: uma frase e um botão. Nada de parágrafo explicativo.
import type { ReactNode } from "react";

export function EstadoVazio({
  frase,
  acao,
  className = "",
}: {
  frase: string;
  acao: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-cartao border-linha-forte flex flex-col items-start gap-5 border border-dashed px-6 py-8 ${className}`}
    >
      <p className="font-livro text-livro-24 text-tinta max-w-[28ch]">
        {frase}
      </p>
      {acao}
    </div>
  );
}
