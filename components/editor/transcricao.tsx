"use client";

// Transcrição navegável (prompt 8): os segmentos da história, com quem fala e o minuto.
// Tocar toca dali em diante; o trecho tocando fica destacado e a lista acompanha. Os
// segmentos que sustentam o parágrafo do cursor ganham uma barra na margem.
import { useEffect, useRef } from "react";
import { minutos, type SegmentoDaTela } from "@/lib/editor/ouvir";

export function Transcricao({
  segmentos,
  atual,
  destacados,
  aoTocar,
}: {
  segmentos: SegmentoDaTela[];
  atual: number | null;
  destacados: Set<number>;
  aoTocar: (s: SegmentoDaTela) => void;
}) {
  const lista = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (atual === null) return;
    const el = lista.current?.querySelector<HTMLElement>(
      `[data-seg="${atual}"]`,
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [atual]);

  if (!segmentos.length)
    return (
      <p className="text-ui-17 text-tinta-2">
        A transcrição desta história não está disponível.
      </p>
    );

  return (
    <ol ref={lista} className="flex flex-col gap-1">
      {segmentos.map((s, i) => {
        const mesmo = i > 0 && segmentos[i - 1].falante === s.falante;
        const tocando = atual === s.id;
        return (
          <li key={`${s.gravacao}-${s.id}`} data-seg={s.id}>
            <button
              type="button"
              onClick={() => aoTocar(s)}
              aria-current={tocando ? "true" : undefined}
              className={
                "rounded-interno flex w-full flex-col gap-1 border-l-2 px-3 py-2 text-left transition-colors duration-[var(--dur-rapida)] " +
                (tocando
                  ? "bg-floresta-claro border-floresta"
                  : destacados.has(s.id)
                    ? "border-floresta/50 hover:bg-polen-2"
                    : "hover:bg-polen-2 border-transparent")
              }
            >
              {!mesmo ? (
                <span className="text-ui-13 text-tinta-2 flex gap-2 font-medium">
                  <span>{s.falante}</span>
                  <span className="num">{minutos(s.inicio)}</span>
                </span>
              ) : null}
              <span className="text-ui-17 text-tinta">{s.texto}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
