"use client";

// Seletor nativo: no celular abre a roda do próprio sistema, que o avô já conhece.
import type { SelectHTMLAttributes } from "react";
import {
  Moldura,
  bordaDoControle,
  classesDoControle,
  useIdsDoCampo,
} from "./campo";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo: string;
  opcoes: { valor: string; rotulo: string }[];
  dica?: string;
  erro?: string;
  vazio?: string; // texto da opção inicial, sem valor
};

export function Seletor({
  rotulo,
  opcoes,
  dica,
  erro,
  vazio,
  id: idExterno,
  className,
  ...resto
}: Props) {
  const { id, descritoPor } = useIdsDoCampo(idExterno, { dica, erro });
  return (
    <Moldura
      id={id}
      rotulo={rotulo}
      dica={dica}
      erro={erro}
      className={className}
    >
      <div className="relative">
        <select
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritoPor}
          className={`${classesDoControle} ${bordaDoControle(erro)} min-h-alvo appearance-none pr-12`}
          {...resto}
        >
          {vazio ? <option value="">{vazio}</option> : null}
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="text-tinta-2 pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </Moldura>
  );
}
