import { MARCA } from "@/lib/config";

export function Marca({ className = "" }: { className?: string }) {
  return (
    <p
      className={`font-livro text-tinta text-[22px] tracking-tight ${className}`}
    >
      {MARCA}
    </p>
  );
}
