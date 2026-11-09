import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  nome: string;
};

export function Campo({ rotulo, nome, className = "", ...props }: Props) {
  return (
    <label className={`font-ui flex flex-col gap-2 ${className}`}>
      <span className="text-tinta-2 text-[15px]">{rotulo}</span>
      <input
        {...props}
        name={nome}
        className="bg-papel text-tinta border-tinta/15 focus:border-floresta focus:ring-floresta/25 min-h-14 rounded-2xl border px-4 text-[17px] outline-none focus:ring-2"
      />
    </label>
  );
}
