"use client";

// Ajustar a foto da história (P75): cortar (formato, aproximar, arrastar) e, só na 1ª foto,
// escolher se ela fica junto com a história ou numa página inteira ao lado. O que se vê na
// moldura é o que vai para o papel: a mesma conta (lib/livro/recorte.ts) corta a foto no PDF.
import { useRef, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import type { FotoDaHistoria } from "@/lib/historias/tipos";
import {
  APROXIMAR_MAX,
  dimensoesRecortadas,
  estadoDoRecorte,
  moverRecorte,
  recorteDoEstado,
  type EstadoDoRecorte,
  type Formato,
  type Recorte,
} from "@/lib/livro/recorte";

const FORMATOS: { valor: Formato; rotulo: string }[] = [
  { valor: "inteira", rotulo: "Inteira" },
  { valor: "quadrada", rotulo: "Quadrada" },
  { valor: "em-pe", rotulo: "Em pé" },
  { valor: "deitada", rotulo: "Deitada" },
];
const PASSO_TECLADO = 3;

/** A foto já recortada: a moldura tem a proporção do recorte e a imagem fica deslocada dentro. */
export function FotoRecortada({
  url,
  largura,
  altura,
  recorte,
  alt,
  alturaMax = "50dvh",
}: {
  url: string;
  largura: number | null;
  altura: number | null;
  recorte: Recorte | null;
  alt: string;
  alturaMax?: string;
}) {
  const r = recorte ?? { x: 0, y: 0, l: 100, a: 100 };
  const d = dimensoesRecortadas({ largura, altura, recorte });
  const prop = d.largura && d.altura ? d.largura / d.altura : 4 / 3;
  return (
    <div
      className="bg-polen-2 relative mx-auto overflow-hidden"
      style={{
        aspectRatio: `${prop}`,
        width: `min(100%, calc(${alturaMax} * ${prop}))`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage */}
      <img
        src={url}
        alt={alt}
        draggable={false}
        className="pointer-events-none absolute max-w-none select-none"
        style={{
          width: `${(100 / r.l) * 100}%`,
          height: `${(100 / r.a) * 100}%`,
          left: `${(-r.x / r.l) * 100}%`,
          top: `${(-r.y / r.a) * 100}%`,
        }}
      />
    </div>
  );
}

/** A moldura que a pessoa arrasta (ou move com as setas) para escolher a parte que fica. */
function Moldura({
  foto,
  estado,
  aoMudar,
}: {
  foto: FotoDaHistoria;
  estado: EstadoDoRecorte;
  aoMudar: (e: EstadoDoRecorte) => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ px: number; py: number; e: EstadoDoRecorte } | null>(
    null,
  );
  const [movendo, setMovendo] = useState(false);
  const recorte = recorteDoEstado(foto, estado);
  const r = recorte ?? { x: 0, y: 0, l: 100, a: 100 };

  function aoPressionar(e: React.PointerEvent<HTMLDivElement>) {
    arraste.current = { px: e.clientX, py: e.clientY, e: estado };
    e.currentTarget.setPointerCapture(e.pointerId);
    setMovendo(true);
  }
  function aoArrastar(e: React.PointerEvent<HTMLDivElement>) {
    const a = arraste.current;
    // A moldura (a foto recortada), não a área toda: ela é mais estreita que a folha.
    const el = area.current?.firstElementChild as HTMLElement | null;
    if (!a || !el) return;
    // Arrastar a foto para a esquerda mostra mais da direita: o recorte anda no sentido contrário.
    const dx = -((e.clientX - a.px) / el.clientWidth) * r.l;
    const dy = -((e.clientY - a.py) / el.clientHeight) * r.a;
    aoMudar(moverRecorte(foto, a.e, dx, dy));
  }
  function aoLargar() {
    arraste.current = null;
    setMovendo(false);
  }
  function aoTeclar(e: React.KeyboardEvent<HTMLDivElement>) {
    const d = {
      ArrowLeft: [-PASSO_TECLADO, 0],
      ArrowRight: [PASSO_TECLADO, 0],
      ArrowUp: [0, -PASSO_TECLADO],
      ArrowDown: [0, PASSO_TECLADO],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    aoMudar(moverRecorte(foto, estado, d[0], d[1]));
  }

  return (
    <div
      ref={area}
      role="group"
      tabIndex={0}
      aria-label="Parte da foto que vai para o livro. Use as setas para mover."
      onPointerDown={aoPressionar}
      onPointerMove={aoArrastar}
      onPointerUp={aoLargar}
      onPointerCancel={aoLargar}
      onKeyDown={aoTeclar}
      className={`rounded-interno focus-visible:outline-floresta touch-none overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 ${movendo ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <FotoRecortada
        url={foto.url}
        largura={foto.largura}
        altura={foto.altura}
        recorte={recorte}
        alt={foto.legenda ?? "Foto da história"}
        alturaMax="42dvh"
      />
    </div>
  );
}

function Opcao({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativa}
      onClick={onClick}
      className={`text-ui-15 min-h-11 rounded-full px-4 ${
        ativa
          ? "bg-floresta text-papel font-medium"
          : "bg-polen-2 text-tinta hover:bg-polen"
      }`}
    >
      {children}
    </button>
  );
}

export function FolhaAjustarFoto({
  foto,
  primeira,
  aoFechar,
  aoSalvar,
}: {
  /** null = folha fechada. */
  foto: FotoDaHistoria | null;
  primeira: boolean;
  aoFechar: () => void;
  aoSalvar: (ajuste: {
    recorte: Recorte | null;
    aoLado: boolean;
  }) => Promise<string | null>;
}) {
  return (
    <FolhaInferior
      aberta={foto !== null}
      aoFechar={aoFechar}
      titulo="Ajustar a foto"
    >
      {foto ? (
        <Conteudo
          key={foto.id}
          foto={foto}
          primeira={primeira}
          aoSalvar={aoSalvar}
        />
      ) : null}
    </FolhaInferior>
  );
}

function Conteudo({
  foto,
  primeira,
  aoSalvar,
}: {
  foto: FotoDaHistoria;
  primeira: boolean;
  aoSalvar: (ajuste: {
    recorte: Recorte | null;
    aoLado: boolean;
  }) => Promise<string | null>;
}) {
  const [estado, setEstado] = useState(() =>
    estadoDoRecorte(foto, foto.recorte),
  );
  const [aoLado, setAoLado] = useState(foto.aoLado && primeira);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const e = await aoSalvar({
      recorte: recorteDoEstado(foto, estado),
      aoLado,
    });
    setSalvando(false);
    if (e) setErro(e);
  }

  return (
    <div className="flex flex-col gap-5">
      <Moldura foto={foto} estado={estado} aoMudar={setEstado} />
      <DicaPrimeiraVez chave="ajustar-foto">
        Arraste a foto para escolher a parte que fica.
      </DicaPrimeiraVez>

      <div className="flex flex-col gap-2">
        <p className="text-ui-15 text-tinta-2" id="formato-rotulo">
          Formato
        </p>
        <div
          role="radiogroup"
          aria-labelledby="formato-rotulo"
          className="flex flex-wrap gap-2"
        >
          {FORMATOS.map((f) => (
            <Opcao
              key={f.valor}
              ativa={estado.formato === f.valor}
              onClick={() =>
                setEstado((e) => ({ ...e, formato: f.valor, zoom: 1 }))
              }
            >
              {f.rotulo}
            </Opcao>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-ui-15 text-tinta-2">Aproximar</span>
        <input
          type="range"
          min={1}
          max={APROXIMAR_MAX}
          step={0.05}
          value={estado.zoom}
          onChange={(e) =>
            setEstado((s) =>
              moverRecorte(foto, { ...s, zoom: Number(e.target.value) }, 0, 0),
            )
          }
          className="accent-floresta min-h-11 w-full"
        />
      </label>

      {primeira ? (
        <div className="flex flex-col gap-2">
          <p className="text-ui-15 text-tinta-2" id="lugar-rotulo">
            Onde fica no livro
          </p>
          <div
            role="radiogroup"
            aria-labelledby="lugar-rotulo"
            className="flex flex-wrap gap-2"
          >
            <Opcao ativa={!aoLado} onClick={() => setAoLado(false)}>
              Junto com a história
            </Opcao>
            <Opcao ativa={aoLado} onClick={() => setAoLado(true)}>
              Página inteira, ao lado
            </Opcao>
          </div>
          {aoLado ? (
            <p className="text-ui-13 text-tinta-2">
              Usa 1 página a mais no livro.
            </p>
          ) : null}
        </div>
      ) : null}

      {erro ? (
        <p className="text-ui-15 text-erro" role="alert">
          {erro}
        </p>
      ) : null}
      <Botao larguraTotal carregando={salvando} onClick={() => void salvar()}>
        Salvar
      </Botao>
    </div>
  );
}
