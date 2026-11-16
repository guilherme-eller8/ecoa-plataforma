// Cabeçalho comum das telas do admin: marca, "Meus livros" (volta à escolha de / para quem é
// admin e também responsável) e as abas (Livros, Aderência, Erros, Evals).
import Link from "next/link";
import { Marca } from "@/components/ui/marca";

const ABAS = [
  { id: "livros", rotulo: "Livros", href: "/admin" },
  { id: "aderencia", rotulo: "Aderência", href: "/admin/aderencia" },
  { id: "erros", rotulo: "Erros", href: "/admin/erros" },
  { id: "evals", rotulo: "Evals", href: "/admin/evals" },
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
        <Link
          href="/"
          className="font-ui text-floresta min-h-alvo inline-flex items-center text-[15px] font-medium underline-offset-4 hover:underline"
        >
          Meus livros
        </Link>
      </div>
      <nav aria-label="Admin" className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={a.href}
            aria-current={a.id === aba ? "page" : undefined}
            className={`font-ui rounded-controle flex min-h-11 shrink-0 items-center px-3 text-[16px] ${
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
