"use client";

// Onde a foto "foca" no retângulo da capa: arrastar a foto (ou usar as setas) mostra outra
// parte dela. O retângulo tem a proporção da caixa impressa, então o que se vê aqui é o que
// vai para a capa. O valor é a % da foto (50 = centro) e só é salvo ao soltar.
import { useRef, useState } from "react";
import { fotoDaCapaMm } from "@/lib/livro/montar-dados";

const PASSO_TECLADO = 5;
const limitar = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

export function FocoDaFoto({
  url,
  largura,
  altura,
  x,
  y,
  desabilitado = false,
  aoMudar,
  aoSoltar,
}: {
  url: string;
  largura: number | null;
  altura: number | null;
  x: number;
  y: number;
  desabilitado?: boolean;
  aoMudar: (x: number, y: number) => void; // durante o arraste
  aoSoltar: (x: number, y: number) => void; // para salvar
}) {
  const caixa = fotoDaCapaMm();
  const quadro = caixa.larguraMm / caixa.alturaMm;
  const proporcao = largura && altura ? largura / altura : 4 / 3;
  const arraste = useRef<{
    px: number;
    py: number;
    x: number;
    y: number;
    sobraX: number;
    sobraY: number;
  } | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const [movendo, setMovendo] = useState(false);
  // A foto só se mexe no sentido em que ela passa do quadro.
  const sobraX = proporcao > quadro;

  function aoPressionar(e: React.PointerEvent<HTMLDivElement>) {
    if (desabilitado || !area.current) return;
    const w = area.current.clientWidth;
    const h = area.current.clientHeight;
    arraste.current = {
      px: e.clientX,
      py: e.clientY,
      x,
      y,
      sobraX: proporcao > quadro ? h * proporcao - w : 0,
      sobraY: proporcao > quadro ? 0 : w / proporcao - h,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setMovendo(true);
  }

  function aoArrastar(e: React.PointerEvent<HTMLDivElement>) {
    const a = arraste.current;
    if (!a) return;
    // Arrastar a foto para a esquerda mostra mais da direita: o foco avança.
    const nx =
      a.sobraX > 0 ? limitar(a.x - ((e.clientX - a.px) / a.sobraX) * 100) : a.x;
    const ny =
      a.sobraY > 0 ? limitar(a.y - ((e.clientY - a.py) / a.sobraY) * 100) : a.y;
    aoMudar(nx, ny);
  }

  function aoLargar() {
    if (!arraste.current) return;
    arraste.current = null;
    setMovendo(false);
    aoSoltar(x, y);
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLDivElement>) {
    if (desabilitado) return;
    const d = {
      ArrowLeft: [-PASSO_TECLADO, 0],
      ArrowRight: [PASSO_TECLADO, 0],
      ArrowUp: [0, -PASSO_TECLADO],
      ArrowDown: [0, PASSO_TECLADO],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    const nx = sobraX ? limitar(x + d[0]) : x;
    const ny = sobraX ? y : limitar(y + d[1]);
    aoMudar(nx, ny);
    aoSoltar(nx, ny);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={area}
        role="group"
        tabIndex={desabilitado ? -1 : 0}
        aria-label="Enquadramento da foto na capa. Use as setas para mover."
        onPointerDown={aoPressionar}
        onPointerMove={aoArrastar}
        onPointerUp={aoLargar}
        onPointerCancel={aoLargar}
        onKeyDown={aoTeclar}
        style={{ aspectRatio: `${caixa.larguraMm} / ${caixa.alturaMm}` }}
        className={`rounded-interno bg-polen-2 focus-visible:outline-floresta w-full touch-none overflow-hidden select-none focus-visible:outline-2 focus-visible:outline-offset-2 ${
          desabilitado ? "" : movendo ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage */}
        <img
          src={url}
          alt="Foto da capa"
          draggable={false}
          style={{ objectPosition: `${x}% ${y}%` }}
          className="pointer-events-none size-full object-cover"
        />
      </div>
      {desabilitado ? null : (
        <p className="text-ui-13 text-tinta-2">
          Arraste a foto para escolher o que aparece na capa.
        </p>
      )}
    </div>
  );
}
