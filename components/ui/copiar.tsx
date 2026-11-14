"use client";

import { useState } from "react";
import { Botao, type VarianteBotao } from "./botao";

/** Copia o texto e mostra "Copiado" por 2 s. */
export function Copiar({
  texto,
  rotulo = "Copiar",
  variante = "texto",
}: {
  texto: string;
  rotulo?: string;
  variante?: VarianteBotao;
}) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Botao
      variante={variante}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          window.setTimeout(() => setCopiado(false), 2000);
        } catch {
          setCopiado(false);
        }
      }}
    >
      {copiado ? "Copiado" : rotulo}
    </Botao>
  );
}
