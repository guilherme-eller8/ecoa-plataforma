// Cabeçalho comum das telas do admin: marca e três abas (Livros, Aderência, Erros).
import Link from "next/link";
import { Marca } from "@/components/ui/marca";

const ABAS = [
  { id: "livros", rotulo: "Livros", href: "/admin" },
  { id: "aderencia", rotulo: "Aderência", href: "/admin/aderencia" },
  { id: "erros", rotulo: "Erros", href: "/admin/erros" },
] as const;

export type AbaAdmin = (typeof ABAS)[number]["id"];

export function CabecalhoAdmin({
  aba,
  titulo,
}: {
  aba: AbaAdmin;
  titulo?: string;
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <Marca />
        <span className="font-ui text-tinta-2 text-[15px]">Admin</span>
      </div>
      <nav aria-label="Admin" className="flex gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={a.href}
            aria-current={a.id === aba ? "page" : undefined}
            className={`font-ui rounded-controle flex min-h-11 items-center px-4 text-[16px] ${
              a.id === aba
                ? "bg-floresta-claro text-floresta font-semibold"
                : "text-tinta-2 hover:bg-polen-2"
            }`}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>
      {titulo ? (
        <h1 className="font-ui text-tinta text-[22px] font-semibold">
          {titulo}
        </h1>
      ) : null}
    </header>
  );
}
