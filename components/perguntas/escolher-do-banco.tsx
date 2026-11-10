"use client";

// Lista do banco de perguntas por tema, com filtro de fé. Marca e desmarca.
import { useState } from "react";
import { TEMAS, perguntasDoTema } from "@/lib/perguntas/banco";

export function EscolherDoBanco({
  marcadas,
  aoMudar,
  esconder = [],
  limite,
}: {
  marcadas: string[];
  aoMudar: (ids: string[]) => void;
  esconder?: string[]; // já estão no livro
  limite?: number;
}) {
  const [tema, setTema] = useState(TEMAS[0].id);
  const [comFe, setComFe] = useState(false);
  const lista = perguntasDoTema(tema, comFe ? {} : { fe: false }).filter(
    (p) => !esconder.includes(p.id),
  );
  const cheio = limite !== undefined && marcadas.length >= limite;

  function alternar(id: string) {
    aoMudar(
      marcadas.includes(id)
        ? marcadas.filter((x) => x !== id)
        : [...marcadas, id],
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Temas"
        className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 md:-mx-8 md:px-8"
      >
        {TEMAS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={t.id === tema}
            onClick={() => setTema(t.id)}
            className={
              "min-h-alvo rounded-controle text-ui-15 shrink-0 border px-4 " +
              (t.id === tema
                ? "border-tinta bg-tinta text-papel"
                : "border-linha-forte text-tinta hover:bg-polen-2")
            }
          >
            {t.nome}
          </button>
        ))}
      </div>
      <label className="text-ui-15 text-tinta-2 inline-flex min-h-11 items-center gap-3 self-start">
        <input
          type="checkbox"
          checked={comFe}
          onChange={(e) => setComFe(e.target.checked)}
          className="accent-floresta size-5"
        />
        Mostrar perguntas de fé
      </label>
      <ul className="flex flex-col gap-2">
        {lista.map((p) => {
          const marcada = marcadas.includes(p.id);
          return (
            <li key={p.id}>
              <label
                className={
                  "rounded-interno min-h-alvo flex cursor-pointer items-start gap-3 border px-4 py-3 " +
                  (marcada
                    ? "border-floresta/40 bg-floresta-claro"
                    : "border-linha bg-papel")
                }
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  disabled={!marcada && cheio}
                  onChange={() => alternar(p.id)}
                  className="accent-floresta mt-1 size-5 shrink-0"
                />
                <span className="font-livro text-livro-20 text-tinta">
                  {p.texto}
                  {p.fe ? (
                    <span className="text-ui-13 text-tinta-2 ml-2 font-sans">
                      Fé
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
