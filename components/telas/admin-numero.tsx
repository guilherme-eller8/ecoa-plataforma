// Peças comuns das telas de Evals (1A): um número grande com rótulo, a taxa com contagem e as
// abas internas (Custo e tempo · Adoção). Sem estado.
import Link from "next/link";
import { EVALS_AMOSTRA_MIN } from "@/lib/config";
import type { Taxa } from "@/lib/evals/custo";

export const apoio = "font-ui text-tinta-2 text-[15px]";
export const tituloSecao = "font-ui text-tinta text-[17px] font-semibold";

export const pct = (f: number) => `${Math.round(f * 100)}%`;

/** Taxa com a contagem sempre à vista; abaixo da amostra mínima, sem percentual. */
export function textoDaTaxa(t: Taxa): { valor: string; detalhe: string } {
  return t.fracao === null
    ? {
        valor: t.de === 0 ? "—" : `${t.n} de ${t.de}`,
        detalhe: t.de === 0 ? "sem dados" : "amostra pequena",
      }
    : { valor: pct(t.fracao), detalhe: `${t.n} de ${t.de}` };
}

export function Numero({
  rotulo,
  valor,
  detalhe,
  alerta = false,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  alerta?: boolean;
}) {
  return (
    <div className="bg-papel flex flex-col gap-1 rounded-2xl p-4">
      <span
        className={`font-ui text-[26px] leading-tight font-semibold tabular-nums ${
          alerta ? "text-aviso" : "text-tinta"
        }`}
      >
        {valor}
      </span>
      <span className="font-ui text-tinta text-[15px]">{rotulo}</span>
      {detalhe ? <span className={apoio}>{detalhe}</span> : null}
    </div>
  );
}

const ABAS = [
  { id: "custo", rotulo: "Custo e tempo", href: "/admin/evals" },
  { id: "adocao", rotulo: "Adoção", href: "/admin/evals/adocao" },
] as const;

export function AbasEvals({ atual }: { atual: "custo" | "adocao" }) {
  return (
    <nav aria-label="Evals" className="flex gap-2">
      {ABAS.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          aria-current={a.id === atual ? "page" : undefined}
          className={`font-ui min-h-alvo inline-flex items-center rounded-full border px-4 text-[15px] ${
            a.id === atual
              ? "border-floresta text-floresta font-semibold"
              : "border-linha text-tinta-2 hover:bg-polen-2"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}

export const AMOSTRA_PEQUENA = (n: number) => n < EVALS_AMOSTRA_MIN;
