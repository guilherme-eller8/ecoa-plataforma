"use client";

import { useEffect, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { CartaoHistoria } from "@/components/ui/cartao-historia";
import type { Etapa } from "@/lib/ui/etapas";

const TEXTO =
  "Era janeiro de 1971 e a gente tinha alugado uma casa a duas quadras da praia. Eu acordei com o sol já alto e a Lurdes rindo na porta: a praia tinha ficado para o dia seguinte.";

// Percorre as etapas e escreve o texto como numa conversa com IA.
// Com "reduzir movimento", o texto aparece inteiro de uma vez.
export function DemoCartaoAoVivo() {
  const [etapa, setEtapa] = useState<Etapa>("enviando");
  const [letras, setLetras] = useState(0);

  useEffect(() => {
    if (etapa === "enviando" || etapa === "ouvindo") {
      const t = setTimeout(
        () => setEtapa(etapa === "enviando" ? "ouvindo" : "escrevendo"),
        1600,
      );
      return () => clearTimeout(t);
    }
    if (etapa === "escrevendo") {
      const reduzir = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduzir || letras >= TEXTO.length) {
        const t = setTimeout(() => {
          setLetras(TEXTO.length);
          setEtapa("revisar");
        }, 800);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setLetras((n) => n + 3), 40);
      return () => clearTimeout(t);
    }
  }, [etapa, letras]);

  return (
    <div className="flex flex-col gap-4">
      <CartaoHistoria
        titulo="A vez em Guarapari"
        estado={etapa}
        origem="Causo da Tia Cida"
        duracaoSeg={412}
        trecho={
          etapa === "escrevendo" || etapa === "revisar"
            ? TEXTO.slice(0, letras) || undefined
            : undefined
        }
        destaque={etapa !== "revisar"}
        acao={
          etapa === "revisar" ? (
            <Botao variante="texto">Revisar</Botao>
          ) : undefined
        }
      />
      <div>
        <Botao
          variante="texto"
          onClick={() => {
            setLetras(0);
            setEtapa("enviando");
          }}
        >
          Recomeçar
        </Botao>
      </div>
    </div>
  );
}
