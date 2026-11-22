"use client";

// Folhear o livro página a página: a versão publicada (prompt 13) e a prévia antes de publicar
// (P72) usam este mesmo componente. No celular, uma página por vez; a partir de 768 px, o livro
// aberto (par à esquerda, ímpar à direita, como no papel: a página 1 abre sozinha à direita).
// Setas na tela (o gesto óbvio para quem tem 80 anos) e setas do teclado. As páginas chegam em
// lotes de `porPedido`, pedidos um pouco antes de aparecerem.
import { useCallback, useEffect, useRef, useState } from "react";
import { PreviaDaCapa } from "@/components/montar/previa-capa";
import { Botao } from "@/components/ui/botao";
import type { Resposta } from "@/lib/livro/tipos";

/** Um lugar tocável numa página (P76: a foto que abre "Ajustar a foto"), em % da página. */
export type AreaTocavel = {
  chave: string;
  x: number;
  y: number;
  l: number;
  a: number;
  rotulo: string;
};

function useLivroAberto(): boolean {
  const [largo, setLargo] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const mudar = () => setLargo(m.matches);
    mudar();
    m.addEventListener("change", mudar);
    return () => m.removeEventListener("change", mudar);
  }, []);
  return largo;
}

/** No livro aberto, as duas páginas à vista com a página `p` (0 = capa). */
function dupla(p: number, total: number): [number | null, number | null] {
  if (p === 0) return [null, null];
  const esquerda = p % 2 === 0 ? p : p - 1; // 0 = nada à esquerda da página 1
  const direita = esquerda + 1;
  return [esquerda >= 2 ? esquerda : null, direita <= total ? direita : null];
}

function Pagina({
  n,
  total,
  url,
  lado,
  areas = [],
  aoTocar,
}: {
  n: number | null;
  total: number;
  url: string | undefined;
  lado: "esquerda" | "direita" | "unica";
  areas?: AreaTocavel[];
  aoTocar?: (a: AreaTocavel) => void;
}) {
  const largura =
    // A altura manda: as setas ficam sempre na primeira tela, no celular e no computador.
    lado === "unica"
      ? "w-full max-w-[min(24rem,calc(56dvh*0.713))]"
      : "w-1/2 max-w-[min(24rem,calc(66dvh*0.713))] shrink";
  if (n === null)
    return <div aria-hidden="true" className={`${largura} aspect-[154/216]`} />;
  return (
    <div
      className={`bg-polen-2 relative flex aspect-[154/216] items-center justify-center overflow-hidden ${largura} ${
        lado === "esquerda"
          ? "rounded-l-interno"
          : lado === "direita"
            ? "rounded-r-interno"
            : "rounded-interno"
      } shadow-flutuante`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Página ${n} de ${total}`}
          className="size-full object-contain"
        />
      ) : (
        <span className="text-ui-15 text-tinta-2">Carregando…</span>
      )}
      {url && aoTocar
        ? areas.map((a) => (
            <button
              key={a.chave}
              type="button"
              aria-label={a.rotulo}
              onClick={() => aoTocar(a)}
              className="group hover:ring-floresta focus-visible:ring-floresta absolute rounded-sm ring-inset hover:ring-2 focus-visible:ring-2 focus-visible:outline-none"
              style={{
                left: `${a.x}%`,
                top: `${a.y}%`,
                width: `${a.l}%`,
                height: `${a.a}%`,
              }}
            >
              <span className="bg-papel text-tinta text-ui-13 absolute right-1.5 bottom-1.5 rounded-full px-2.5 py-1 font-medium">
                Ajustar
              </span>
            </button>
          ))
        : null}
    </div>
  );
}

export function Folhear({
  total,
  capa,
  urlsIniciais,
  porPedido,
  pedir,
  areas = {},
  aoTocar,
  paginaInicial = 0,
  aoMudarPagina,
}: {
  total: number;
  /** A capa aberta (imagem); null enquanto não chegou. */
  capa: string | null;
  /** Páginas que já vieram (número da página → URL da imagem). */
  urlsIniciais: Record<number, string>;
  porPedido: number;
  pedir: (de: number) => Promise<Resposta<{ urls: string[] }>>;
  /** P76: lugares tocáveis por página (número da página → áreas). */
  areas?: Record<number, AreaTocavel[]>;
  aoTocar?: (a: AreaTocavel) => void;
  /** Volta para esta página ao recarregar (depois de ajustar uma foto). */
  paginaInicial?: number;
  aoMudarPagina?: (p: number) => void;
}) {
  const largo = useLivroAberto();
  // 0 = a capa; 1..total = as páginas do miolo.
  const [pagina, setPagina] = useState(Math.min(paginaInicial, total));
  useEffect(() => {
    aoMudarPagina?.(pagina);
  }, [pagina, aoMudarPagina]);
  const [urls, setUrls] = useState<Record<number, string>>(urlsIniciais);
  const secao = useRef<HTMLElement>(null);
  const pedidas = useRef(
    new Set<number>(
      Object.keys(urlsIniciais).map(
        (n) => Math.floor((Number(n) - 1) / porPedido) * porPedido + 1,
      ),
    ),
  );

  const garantir = useCallback(
    (p: number) => {
      if (p < 1 || p > total) return;
      const de = Math.floor((p - 1) / porPedido) * porPedido + 1;
      if (pedidas.current.has(de)) return;
      pedidas.current.add(de);
      void pedir(de).then((r) => {
        if (!r.ok) return pedidas.current.delete(de);
        setUrls((u) => ({
          ...u,
          ...Object.fromEntries(r.dados.urls.map((x, i) => [de + i, x])),
        }));
      });
    },
    [pedir, total, porPedido],
  );

  const [esq, dir] = dupla(pagina, total);
  const passo = largo ? 2 : 1;
  const primeira = largo ? (esq ?? dir ?? 0) : pagina;
  const ultima = largo ? (dir ?? esq ?? 0) : pagina;

  const anterior = useCallback(() => {
    setPagina((p) => {
      if (p === 0) return 0;
      if (!largo) return p - 1;
      const [e] = dupla(p, total);
      return Math.max(0, (e ?? 1) - 1);
    });
  }, [largo, total]);
  const proxima = useCallback(() => {
    setPagina((p) => {
      if (!largo) return Math.min(total, p + 1);
      if (p === 0) return 1;
      const [e, d] = dupla(p, total);
      return Math.min(total, (d ?? e ?? p) + 1);
    });
  }, [largo, total]);

  useEffect(() => {
    for (let k = 0; k <= passo * 2; k++) garantir(Math.max(1, primeira) + k);
  }, [primeira, passo, garantir]);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest("input,textarea"))
        return;
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proxima();
    }
    window.addEventListener("keydown", tecla);
    // Marca no DOM que as setas do teclado já respondem (o teste espera por isso).
    secao.current?.setAttribute("data-teclado", "ligado");
    return () => window.removeEventListener("keydown", tecla);
  }, [anterior, proxima]);

  const rotulo =
    pagina === 0
      ? "Capa"
      : largo && esq !== null && dir !== null
        ? `Páginas ${esq} e ${dir} de ${total}`
        : `Página ${primeira} de ${total}`;

  return (
    <section
      ref={secao}
      className="flex flex-col gap-4"
      aria-label="O livro, página a página"
    >
      {pagina === 0 ? (
        capa ? (
          <div className="mx-auto w-full max-w-[calc(58dvh*1.44)]">
            <PreviaDaCapa
              src={capa}
              alt="Capa aberta: verso, lombada e frente"
            />
          </div>
        ) : (
          <p className="text-ui-15 text-tinta-2">Carregando…</p>
        )
      ) : largo ? (
        <div className="flex justify-center">
          <Pagina
            n={esq}
            total={total}
            url={esq ? urls[esq] : undefined}
            lado="esquerda"
            areas={esq ? areas[esq] : []}
            aoTocar={aoTocar}
          />
          <Pagina
            n={dir}
            total={total}
            url={dir ? urls[dir] : undefined}
            lado="direita"
            areas={dir ? areas[dir] : []}
            aoTocar={aoTocar}
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <Pagina
            n={pagina}
            total={total}
            url={urls[pagina]}
            lado="unica"
            areas={areas[pagina]}
            aoTocar={aoTocar}
          />
        </div>
      )}
      {/* Celular: o número da página numa linha e os dois botões, lado a lado, na de baixo. */}
      <div className="grid grid-cols-2 items-center gap-3 md:flex md:justify-between">
        <span
          className="text-ui-15 text-tinta-2 order-first col-span-2 text-center whitespace-nowrap md:order-none"
          aria-live="polite"
        >
          {rotulo}
        </span>
        <Botao
          variante="secundario"
          disabled={pagina === 0}
          onClick={anterior}
          className="whitespace-nowrap md:order-first"
        >
          ← Anterior
        </Botao>
        <Botao
          variante="secundario"
          disabled={ultima >= total}
          onClick={proxima}
          className="whitespace-nowrap"
        >
          Próxima →
        </Botao>
      </div>
    </section>
  );
}
