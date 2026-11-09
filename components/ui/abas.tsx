"use client";

// Abas acessíveis: setas, Home e End movem entre elas. No celular a linha de abas
// rola de lado dentro dela mesma; a página nunca rola de lado.
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type Aba = {
  id: string;
  rotulo: string;
  contagem?: number;
  conteudo: ReactNode;
};

type Props = {
  abas: Aba[];
  inicial?: string;
  // Controle externo (opcional): quem usa sabe qual aba está aberta (ex.: ?aba= na URL).
  ativa?: string;
  aoMudar?: (id: string) => void;
  rotulo: string; // nome do grupo, para o leitor de tela
  titulo?: ReactNode; // quando há, fica na mesma linha das abas (desktop)
  className?: string;
};

export function Abas({
  abas,
  inicial,
  ativa: ativaExterna,
  aoMudar,
  rotulo,
  titulo,
  className = "",
}: Props) {
  const [ativaInterna, setAtivaInterna] = useState(inicial ?? abas[0]?.id);
  const ativa = ativaExterna ?? ativaInterna;
  const setAtiva = (id: string) => {
    setAtivaInterna(id);
    aoMudar?.(id);
  };
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function mover(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const ultimo = abas.length - 1;
    const destino =
      e.key === "ArrowRight"
        ? (i + 1) % abas.length
        : e.key === "ArrowLeft"
          ? (i - 1 + abas.length) % abas.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? ultimo
              : null;
    if (destino === null) return;
    e.preventDefault();
    setAtiva(abas[destino].id);
    refs.current[destino]?.focus();
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {titulo}
        <div
          role="tablist"
          aria-label={rotulo}
          className="-mx-4 flex [scrollbar-width:none] gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          {abas.map((aba, i) => {
            const selecionada = aba.id === ativa;
            return (
              <button
                key={aba.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                role="tab"
                type="button"
                id={`${base}-aba-${aba.id}`}
                aria-selected={selecionada}
                aria-controls={`${base}-painel-${aba.id}`}
                tabIndex={selecionada ? 0 : -1}
                onClick={() => setAtiva(aba.id)}
                onKeyDown={(e) => mover(e, i)}
                className={
                  "min-h-alvo rounded-controle text-ui-17 inline-flex shrink-0 items-center gap-2 px-4 " +
                  "transition-colors duration-[var(--dur-rapida)] " +
                  (selecionada
                    ? "bg-tinta text-papel font-medium"
                    : "text-tinta-2 hover:bg-polen-2 hover:text-tinta")
                }
              >
                {aba.rotulo}
                {aba.contagem !== undefined ? (
                  <span className="num text-ui-15 opacity-80">
                    {aba.contagem}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      {abas.map((aba) => (
        <div
          key={aba.id}
          role="tabpanel"
          id={`${base}-painel-${aba.id}`}
          aria-labelledby={`${base}-aba-${aba.id}`}
          hidden={aba.id !== ativa}
          tabIndex={0}
          className="pt-6 focus-visible:outline-offset-8"
        >
          {aba.conteudo}
        </div>
      ))}
    </div>
  );
}
