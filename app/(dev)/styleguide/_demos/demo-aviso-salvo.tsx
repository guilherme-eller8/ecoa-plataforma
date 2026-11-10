"use client";

import { useEffect, useState } from "react";
import { AvisoSalvo, type EstadoSalvo } from "@/components/ui/aviso-salvo";
import { Botao } from "@/components/ui/botao";

export function DemoAvisoSalvo() {
  const [estado, setEstado] = useState<EstadoSalvo>("parado");

  useEffect(() => {
    if (estado === "salvando") {
      const t = setTimeout(() => setEstado("salvo"), 900);
      return () => clearTimeout(t);
    }
    if (estado === "salvo") {
      const t = setTimeout(() => setEstado("parado"), 2400);
      return () => clearTimeout(t);
    }
  }, [estado]);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Botao variante="secundario" onClick={() => setEstado("salvando")}>
        Editar e salvar
      </Botao>
      <AvisoSalvo estado={estado} />
    </div>
  );
}
