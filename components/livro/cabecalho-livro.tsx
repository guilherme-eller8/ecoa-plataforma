"use client";

// Cabeçalho das telas principais do livro: a marca volta ao início; no computador, as 4
// seções principais ficam à vista e o resto (e o Sair) no menu da conta; no celular, tudo
// cabe no Menu. Telas de tarefa (gravar, editor, montar) não usam: têm o próprio Voltar.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sair } from "@/app/acoes-sessao";
import { MarcaEcoa } from "@/components/ui/marca";

export type SecaoDoLivro =
  | "inicio"
  | "historias"
  | "perguntas"
  | "montar"
  | "audios"
  | "mensagens"
  | "kit"
  | "pessoas"
  | "configuracoes";

type Item = { secao: SecaoDoLivro; rotulo: string; caminho: string };

const PRINCIPAIS: Item[] = [
  { secao: "inicio", rotulo: "Início", caminho: "" },
  { secao: "historias", rotulo: "Histórias", caminho: "/historias" },
  { secao: "perguntas", rotulo: "Perguntas", caminho: "/perguntas" },
  { secao: "montar", rotulo: "Montar o livro", caminho: "/montar" },
];

const DO_MENU: Item[] = [
  { secao: "audios", rotulo: "Áudios recebidos", caminho: "/audios" },
  { secao: "mensagens", rotulo: "Mensagens da família", caminho: "/mensagens" },
  { secao: "kit", rotulo: "Convidar a família", caminho: "/kit" },
  { secao: "pessoas", rotulo: "Quem ajuda", caminho: "/pessoas" },
  {
    secao: "configuracoes",
    rotulo: "Configurações",
    caminho: "/configuracoes",
  },
];

// Menu aberto é sobreposição de verdade: a sombra o separa da página.
const caixaDoMenu =
  "rounded-cartao bg-papel border-linha animate-surgir absolute top-full right-0 z-30 mt-2 flex w-72 flex-col border p-2 shadow-lg"; // taste-skill-ignore: sobreposição

const linkMenu =
  "text-ui-17 text-tinta hover:bg-polen-2 flex min-h-alvo items-center rounded-interno px-4";

export function CabecalhoLivro({
  livroId,
  secao,
  ehAdmin = false,
}: {
  livroId: string;
  secao?: SecaoDoLivro;
  ehAdmin?: boolean;
}) {
  const base = `/livro/${livroId}`;
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: PointerEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node))
        setAberto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <header>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 lg:px-10">
        <Link
          href={base}
          aria-label="Início do livro"
          className="min-h-alvo rounded-controle focus-visible:ring-floresta inline-flex items-center focus-visible:ring-2 focus-visible:outline-none"
        >
          <MarcaEcoa />
        </Link>

        <nav
          aria-label="Principal"
          className="hidden items-center gap-1 md:flex"
        >
          {PRINCIPAIS.map((i) => (
            <Link
              key={i.secao}
              href={`${base}${i.caminho}`}
              aria-current={secao === i.secao ? "page" : undefined}
              className={
                "min-h-alvo rounded-controle text-ui-17 inline-flex items-center px-4 " +
                (secao === i.secao
                  ? "text-tinta bg-polen-2 font-medium"
                  : "text-tinta-2 hover:bg-polen-2 hover:text-tinta")
              }
            >
              {i.rotulo}
            </Link>
          ))}
        </nav>

        <div ref={caixa} className="relative">
          <button
            type="button"
            aria-expanded={aberto}
            aria-controls="menu-do-livro"
            onClick={() => setAberto((a) => !a)}
            className="min-h-alvo rounded-controle text-ui-17 text-tinta hover:bg-polen-2 border-linha-forte inline-flex items-center gap-2 border px-4"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            Menu
          </button>
          {aberto ? (
            <div id="menu-do-livro" className={caixaDoMenu}>
              <ul className="flex flex-col md:hidden">
                {PRINCIPAIS.map((i) => (
                  <li key={i.secao}>
                    <Link
                      href={`${base}${i.caminho}`}
                      aria-current={secao === i.secao ? "page" : undefined}
                      className={
                        linkMenu +
                        (secao === i.secao ? " text-floresta font-medium" : "")
                      }
                    >
                      {i.rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
              <div aria-hidden="true" className="h-3 md:hidden" />
              <ul className="flex flex-col">
                {DO_MENU.map((i) => (
                  <li key={i.secao}>
                    <Link
                      href={`${base}${i.caminho}`}
                      aria-current={secao === i.secao ? "page" : undefined}
                      className={
                        linkMenu +
                        (secao === i.secao ? " text-floresta font-medium" : "")
                      }
                    >
                      {i.rotulo}
                    </Link>
                  </li>
                ))}
                {ehAdmin ? (
                  <li>
                    <Link href="/admin" className={linkMenu}>
                      Admin
                    </Link>
                  </li>
                ) : null}
              </ul>
              <div aria-hidden="true" className="h-3" />
              <form action={sair}>
                <button
                  type="submit"
                  className={linkMenu + " text-tinta-2 w-full text-left"}
                >
                  Sair
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
