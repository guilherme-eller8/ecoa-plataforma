// Botão da Ecoa. Uma ação principal por tela (floresta, chapado, pílula);
// o resto é secundário (contorno) ou texto.
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type VarianteBotao = "principal" | "secundario" | "texto";
export type TamanhoBotao = "padrao" | "autor";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  carregando?: boolean;
  icone?: ReactNode;
  larguraTotal?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-controle font-ui font-medium " +
  "transition-[background-color,color,border-color,transform] duration-[var(--dur-rapida)] ease-saida " +
  "active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 select-none";

const variantes: Record<VarianteBotao, string> = {
  principal:
    "bg-floresta text-papel hover:bg-floresta-escuro disabled:bg-polen-2 disabled:text-tinta-2",
  secundario:
    "border border-linha-forte bg-papel text-tinta hover:bg-polen-2 hover:border-tinta-2 " +
    "disabled:border-linha disabled:text-tinta-2 disabled:hover:bg-papel",
  texto:
    "text-floresta underline-offset-4 hover:underline disabled:text-tinta-2 disabled:no-underline",
};

const tamanhos: Record<TamanhoBotao, Record<VarianteBotao, string>> = {
  padrao: {
    principal: "min-h-alvo px-6 text-ui-17",
    secundario: "min-h-alvo px-6 text-ui-17",
    texto: "min-h-alvo px-2 text-ui-17",
  },
  autor: {
    principal: "min-h-alvo-autor px-8 text-ui-20",
    secundario: "min-h-alvo-autor px-8 text-ui-20",
    texto: "min-h-alvo-autor px-3 text-ui-20",
  },
};

export function classesDoBotao({
  variante = "principal",
  tamanho = "padrao",
  larguraTotal = false,
}: {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  larguraTotal?: boolean;
} = {}) {
  return [
    base,
    variantes[variante],
    tamanhos[tamanho][variante],
    larguraTotal ? "w-full" : "",
  ].join(" ");
}

export function Botao({
  variante = "principal",
  tamanho = "padrao",
  carregando = false,
  icone,
  larguraTotal,
  className = "",
  children,
  disabled,
  type = "button",
  ...resto
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`${classesDoBotao({ variante, tamanho, larguraTotal })} ${className}`}
      {...resto}
    >
      {carregando ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : (
        icone
      )}
      <span>{children}</span>
    </button>
  );
}
