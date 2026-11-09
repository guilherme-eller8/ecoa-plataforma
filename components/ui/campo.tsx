"use client";

// Campo de texto com rótulo sempre visível. Dica e erro ficam ligados ao campo
// por aria-describedby, para o leitor de tela ler junto.
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

type Comum = {
  rotulo: string;
  dica?: string;
  erro?: string;
};

export const classesDoControle =
  "w-full rounded-interno border bg-papel px-4 text-ui-17 text-tinta placeholder:text-tinta-2 " +
  "transition-[border-color,box-shadow] duration-[var(--dur-rapida)] " +
  "focus-visible:outline-none focus-visible:border-floresta focus-visible:ring-2 focus-visible:ring-floresta " +
  "disabled:cursor-not-allowed disabled:bg-polen-2 disabled:text-tinta-2";

export function bordaDoControle(erro?: string) {
  return erro ? "border-erro" : "border-linha-forte";
}

// Rótulo, controle, erro e dica, sempre nessa ordem.
export function Moldura({
  id,
  rotulo,
  dica,
  erro,
  className = "",
  children,
}: Comum & { id: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-ui-15 text-tinta font-medium">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-ui-15 text-erro">
          {erro}
        </p>
      ) : null}
      {dica ? (
        <p id={`${id}-dica`} className="text-ui-15 text-tinta-2">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

export function useIdsDoCampo(
  idExterno: string | undefined,
  c: Pick<Comum, "dica" | "erro">,
) {
  const idGerado = useId();
  const id = idExterno ?? idGerado;
  const descritoPor =
    [c.erro && `${id}-erro`, c.dica && `${id}-dica`]
      .filter(Boolean)
      .join(" ") || undefined;
  return { id, descritoPor };
}

export function Campo({
  rotulo,
  dica,
  erro,
  id: idExterno,
  className,
  ...resto
}: Comum & InputHTMLAttributes<HTMLInputElement>) {
  const { id, descritoPor } = useIdsDoCampo(idExterno, { dica, erro });
  return (
    <Moldura
      id={id}
      rotulo={rotulo}
      dica={dica}
      erro={erro}
      className={className}
    >
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor}
        className={`${classesDoControle} ${bordaDoControle(erro)} min-h-alvo`}
        {...resto}
      />
    </Moldura>
  );
}

export function CampoTexto({
  rotulo,
  dica,
  erro,
  id: idExterno,
  className,
  rows = 4,
  ...resto
}: Comum & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { id, descritoPor } = useIdsDoCampo(idExterno, { dica, erro });
  return (
    <Moldura
      id={id}
      rotulo={rotulo}
      dica={dica}
      erro={erro}
      className={className}
    >
      <textarea
        id={id}
        rows={rows}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor}
        className={`${classesDoControle} ${bordaDoControle(erro)} py-3 leading-normal`}
        {...resto}
      />
    </Moldura>
  );
}
