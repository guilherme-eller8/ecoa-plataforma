import { MARCA } from "@/lib/config";

// A marca da Ecoa: um ponto de voz com dois ecos, na cor floresta, e o nome em Newsreader.
export function MarcaEcoa({ comNome = true }: { comNome?: boolean }) {
  return (
    <span className="text-tinta inline-flex items-center gap-2.5">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="14" cy="14" r="14" fill="var(--floresta)" />
        <circle cx="10" cy="14" r="2.6" fill="var(--papel)" />
        <path
          d="M14.5 9.5a6.4 6.4 0 0 1 0 9"
          stroke="var(--papel)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M18 6.8a10.2 10.2 0 0 1 0 14.4"
          stroke="var(--papel)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
      {comNome ? (
        <span className="font-livro text-[1.375rem] leading-none">Ecoa</span>
      ) : null}
    </span>
  );
}

// Nome completo da marca, em Newsreader, no topo das telas de acesso.
export function Marca({ className = "" }: { className?: string }) {
  return (
    <p
      className={`font-livro text-tinta text-[22px] tracking-tight ${className}`}
    >
      {MARCA}
    </p>
  );
}
