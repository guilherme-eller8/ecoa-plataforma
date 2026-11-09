"use client";

import { useEffect, useState } from "react";
import { Gravador, type EstadoGravador } from "@/components/ui/gravador";

// Simula o gravador: só o relógio anda. Não grava nada.
export function DemoGravador({
  inicial = "pronto" as EstadoGravador,
  segundosIniciais = 0,
}) {
  const [estado, setEstado] = useState<EstadoGravador>(inicial);
  const [segundos, setSegundos] = useState(segundosIniciais);

  useEffect(() => {
    if (estado !== "gravando") return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [estado]);

  return (
    <Gravador
      estado={estado}
      segundos={segundos}
      aoTocar={() =>
        setEstado((e) => (e === "gravando" ? "pausado" : "gravando"))
      }
      aoConcluir={() => {
        setEstado("pronto");
        setSegundos(0);
      }}
    />
  );
}
