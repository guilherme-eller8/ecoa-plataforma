import type { ButtonHTMLAttributes } from "react";

type Variante = "principal" | "secundario" | "texto";

const estilos: Record<Variante, string> = {
  principal:
    "bg-floresta text-papel min-h-14 px-7 rounded-full text-[17px] font-semibold hover:bg-floresta/90 active:scale-[0.99]",
  secundario:
    "bg-papel text-tinta min-h-14 px-7 rounded-full text-[17px] font-semibold hover:bg-papel/70",
  texto:
    "text-tinta-2 min-h-12 px-2 text-[16px] underline underline-offset-4 hover:text-tinta",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  carregando?: boolean;
};

export function Botao({
  variante = "principal",
  carregando = false,
  className = "",
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`font-ui focus-visible:outline-floresta inline-flex items-center justify-center gap-3 transition focus-visible:outline-3 focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none ${estilos[variante]} ${className}`}
    >
      {children}
    </button>
  );
}
