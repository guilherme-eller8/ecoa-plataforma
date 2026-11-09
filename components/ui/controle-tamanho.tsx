"use client";

// Controle de tamanho do texto: 5 posições, de Resumido a Detalhado (PRD, M6).
// Mudar de posição pede uma nova versão à IA; parágrafos editados à mão ficam.
import { useId, useState } from "react";
import { TAMANHOS, avisoTravados, rotuloDoTamanho } from "@/lib/ui/tamanho";

type Props = {
  inicial?: number;
  travados?: number;
  aoMudar?: (posicao: number) => void;
  desabilitado?: boolean;
};

export function ControleTamanho({
  inicial = 3,
  travados = 0,
  aoMudar,
  desabilitado,
}: Props) {
  const [posicao, setPosicao] = useState(inicial);
  const id = useId();
  const aviso = avisoTravados(travados);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-ui-15 text-tinta font-medium">
          Tamanho do texto
        </label>
        <output htmlFor={id} className="text-ui-17 text-floresta font-medium">
          {rotuloDoTamanho(posicao)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={1}
        max={TAMANHOS.length}
        step={1}
        value={posicao}
        disabled={desabilitado}
        aria-valuetext={rotuloDoTamanho(posicao)}
        aria-describedby={aviso ? `${id}-aviso` : undefined}
        onChange={(e) => {
          const v = Number(e.target.value);
          setPosicao(v);
          aoMudar?.(v);
        }}
        className="h-alvo accent-floresta w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div
        aria-hidden="true"
        className="text-ui-13 text-tinta-2 flex justify-between"
      >
        <span>{TAMANHOS[0]}</span>
        <span>{TAMANHOS[TAMANHOS.length - 1]}</span>
      </div>
      {aviso ? (
        <p id={`${id}-aviso`} className="text-ui-15 text-tinta-2">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
