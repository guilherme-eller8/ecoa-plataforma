"use client";

// Moldura dos três passos da montagem (design 5.1): voltar, os passos, o conteúdo e, fixo embaixo,
// o contador de páginas e a ação principal. O contador nunca impede de incluir nada (Q16).
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CONTAR_APOS_MS } from "@/lib/config";
import { resumoDePaginas } from "@/lib/livro/alertas";
import type {
  AcoesMontar,
  ContagemDoLivro,
  PassoDaMontagem,
} from "@/lib/livro/montar-tipos";

const PASSOS: { id: PassoDaMontagem; rotulo: string; caminho: string }[] = [
  { id: "conteudo", rotulo: "Conteúdo", caminho: "" },
  { id: "capa", rotulo: "Capa", caminho: "/capa" },
  { id: "conferir", rotulo: "Conferir", caminho: "/conferir" },
];

export type EstadoDaContagem =
  | { fase: "contando"; contagem: ContagemDoLivro | null }
  | { fase: "ok"; contagem: ContagemDoLivro }
  | { fase: "erro"; contagem: ContagemDoLivro | null; mensagem: string };

/** Conta as páginas 800 ms depois da última mudança salva; "aguarde" tenta de novo sozinho. */
export function useContagem(
  contar: AcoesMontar["contar"],
  versaoSalva: number,
): EstadoDaContagem {
  const [estado, setEstado] = useState<EstadoDaContagem>({
    fase: "contando",
    contagem: null,
  });
  const ultima = useRef<ContagemDoLivro | null>(null);
  useEffect(() => {
    let vivo = true;
    let tentativa: ReturnType<typeof setTimeout>;
    const pedir = () => {
      setEstado({ fase: "contando", contagem: ultima.current });
      void contar().then((r) => {
        if (!vivo) return;
        if (r.ok) {
          ultima.current = r.dados;
          setEstado({ fase: "ok", contagem: r.dados });
        } else {
          setEstado({
            fase: "erro",
            contagem: ultima.current,
            mensagem: r.mensagem,
          });
          tentativa = setTimeout(pedir, 8000);
        }
      });
    };
    tentativa = setTimeout(pedir, CONTAR_APOS_MS);
    return () => {
      vivo = false;
      clearTimeout(tentativa);
    };
  }, [contar, versaoSalva]);
  return estado;
}

export function TextoDoContador({ estado }: { estado: EstadoDaContagem }) {
  const c = estado.contagem;
  if (!c) {
    return (
      <span className="text-ui-17 text-tinta-2" aria-live="polite">
        {estado.fase === "erro" ? "Sem contagem agora" : "Contando…"}
      </span>
    );
  }
  const r = resumoDePaginas(c.paginas);
  return (
    <span
      className={`text-ui-17 text-tinta font-medium ${estado.fase === "contando" ? "opacity-60" : ""}`}
      aria-live="polite"
    >
      {r.titulo}
      {r.extras > 0 ? (
        <span className="text-tinta-2 font-normal">
          {" "}
          · {r.extras} {r.extras === 1 ? "extra" : "extras"}
        </span>
      ) : null}
    </span>
  );
}

export function MolduraDaMontagem({
  livroId,
  autor,
  passo,
  contador,
  acao,
  children,
}: {
  livroId: string;
  autor: string;
  passo: PassoDaMontagem;
  contador: ReactNode;
  acao: ReactNode;
  children: ReactNode;
}) {
  const base = `/livro/${livroId}/montar`;
  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-7 px-5 pt-8 pb-36">
        <Link
          href={`/livro/${livroId}`}
          className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
        >
          ← Livro do {autor}
        </Link>
        <nav aria-label="Passos da montagem">
          <ol className="flex items-center gap-2">
            {PASSOS.map((p, i) => {
              const atual = p.id === passo;
              return (
                <li key={p.id} className="flex flex-1 items-center">
                  <Link
                    href={`${base}${p.caminho}`}
                    aria-current={atual ? "step" : undefined}
                    className={`text-ui-15 flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-3 ${
                      atual
                        ? "border-floresta bg-floresta text-papel font-medium"
                        : "border-linha-forte text-tinta-2 hover:text-tinta"
                    }`}
                  >
                    <span aria-hidden>{i + 1}</span>
                    <span>{p.rotulo}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
        {children}
      </main>
      <div className="bg-papel border-linha fixed inset-x-0 bottom-0 z-10 border-t">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex min-w-0 flex-col">{contador}</div>
          {acao}
        </div>
      </div>
    </>
  );
}

/** Salva uma de cada vez, com a revisão que a tela leu; "outra pessoa salvou" recarrega. */
export function useSalvarMontagem(opcoes: {
  revInicial: number;
  salvar: AcoesMontar["salvar"];
  aoMudarPorOutro: () => void;
}) {
  const rev = useRef(opcoes.revInicial);
  const fila = useRef<Promise<unknown>>(Promise.resolve());
  const [salvando, setSalvando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [versaoSalva, setVersaoSalva] = useState(0);

  function salvarMontagem(
    montar: (rev: number) => Parameters<AcoesMontar["salvar"]>[0],
  ): Promise<boolean> {
    setSalvando((n) => n + 1);
    const feito = fila.current.then(async () => {
      const r = await opcoes.salvar(montar(rev.current));
      if (r.ok) {
        rev.current = r.dados.rev;
        setErro(null);
        setVersaoSalva((v) => v + 1);
        return true;
      }
      if (r.mensagem.startsWith("O livro mudou")) opcoes.aoMudarPorOutro();
      else setErro(r.mensagem);
      return false;
    });
    fila.current = feito.finally(() => setSalvando((n) => n - 1));
    return feito;
  }
  return {
    salvarMontagem,
    salvando: salvando > 0,
    erro,
    versaoSalva,
    esperar: () => fila.current,
  };
}
