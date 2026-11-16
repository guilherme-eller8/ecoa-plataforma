"use client";

// Folhear o livro antes de publicar (P72): o livro como sairia hoje, do mesmo Typst do PDF
// (T20), página a página. Qualquer membro abre. Sem gravar nada: muda a montagem, muda a prévia.
// P76: tocar numa foto abre "Ajustar a foto" ali mesmo (a mesma folha do editor); ao salvar, o
// livro é refeito e volta na mesma página.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FolhaAjustarFoto } from "@/components/editor/ajustar-foto";
import { Folhear, type AreaTocavel } from "@/components/montar/folhear";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FOLHEAR_PAGINAS_POR_PEDIDO } from "@/lib/config";
import type { FotoDaHistoria } from "@/lib/historias/tipos";
import type { Recorte } from "@/lib/livro/recorte";
import type { Resposta } from "@/lib/livro/tipos";

/** Uma foto de história no papel, em % da página (P76). */
export type ToqueDaTela = {
  historiaId: string;
  fotoId: string;
  primeira: boolean;
  pagina: number;
  x: number;
  y: number;
  l: number;
  a: number;
};

export type FolheioDaTela = {
  hash: string;
  total: number;
  capa: string | null;
  de: number;
  urls: string[];
  provisorio: boolean;
  toques: ToqueDaTela[];
};

export type AcoesFolhear = {
  folhear: (de: number) => Promise<Resposta<FolheioDaTela>>;
  fotoParaAjustar: (
    historiaId: string,
    fotoId: string,
  ) => Promise<Resposta<{ foto: FotoDaHistoria; primeira: boolean }>>;
  ajustarFoto: (
    historiaId: string,
    fotoId: string,
    ajuste: { recorte: Recorte | null; aoLado: boolean },
  ) => Promise<Resposta>;
};

type Estado =
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; f: FolheioDaTela };

type EmAjuste = { historiaId: string; foto: FotoDaHistoria; primeira: boolean };

const chaveDo = (t: ToqueDaTela) => `${t.historiaId}:${t.fotoId}`;

function areasDe(toques: ToqueDaTela[]): Record<number, AreaTocavel[]> {
  const r: Record<number, AreaTocavel[]> = {};
  for (const t of toques)
    (r[t.pagina] ??= []).push({
      chave: chaveDo(t),
      x: t.x,
      y: t.y,
      l: t.l,
      a: t.a,
      rotulo: "Ajustar esta foto",
    });
  return r;
}

export function TelaFolhear({
  livroId,
  autor,
  acoes,
}: {
  livroId: string;
  autor: string;
  acoes: AcoesFolhear;
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [rodada, setRodada] = useState(0);
  const [toques, setToques] = useState<ToqueDaTela[]>([]);
  const [emAjuste, setEmAjuste] = useState<EmAjuste | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // Onde a pessoa estava: depois de ajustar, o livro refeito volta nessa página.
  const paginaAtual = useRef(0);
  const [paginaInicial, setPaginaInicial] = useState(0);

  useEffect(() => {
    let vivo = true;
    void acoes.folhear(1).then((r) => {
      if (!vivo) return;
      if (r.ok) setToques(r.dados.toques);
      setEstado(
        r.ok
          ? { tipo: "pronto", f: r.dados }
          : { tipo: "erro", mensagem: r.mensagem },
      );
    });
    return () => {
      vivo = false;
    };
  }, [acoes, rodada]);

  const hash = estado.tipo === "pronto" ? estado.f.hash : null;
  // Alguém mudou a montagem enquanto a pessoa folheava: recomeça do livro novo.
  const pedir = useCallback(
    async (de: number): Promise<Resposta<{ urls: string[] }>> => {
      const r = await acoes.folhear(de);
      if (r.ok && r.dados.hash !== hash) {
        setPaginaInicial(paginaAtual.current);
        setRodada((n) => n + 1);
      } else if (r.ok) setToques(r.dados.toques);
      return r;
    },
    [acoes, hash],
  );

  const aoMudarPagina = useCallback((p: number) => {
    paginaAtual.current = p;
  }, []);

  async function tocar(a: AreaTocavel) {
    const t = toques.find((x) => chaveDo(x) === a.chave);
    if (!t || abrindo) return;
    setAbrindo(true);
    setAviso(null);
    const r = await acoes.fotoParaAjustar(t.historiaId, t.fotoId);
    setAbrindo(false);
    if (!r.ok) return setAviso(r.mensagem);
    setEmAjuste({ historiaId: t.historiaId, ...r.dados });
  }

  async function salvar(ajuste: {
    recorte: Recorte | null;
    aoLado: boolean;
  }): Promise<string | null> {
    if (!emAjuste) return null;
    const r = await acoes.ajustarFoto(
      emAjuste.historiaId,
      emAjuste.foto.id,
      ajuste,
    );
    if (!r.ok) return r.mensagem;
    setEmAjuste(null);
    // O livro muda (a foto pode até ir para outra página): refaz e volta onde a pessoa estava.
    setPaginaInicial(paginaAtual.current);
    setEstado({ tipo: "carregando" });
    setRodada((n) => n + 1);
    return null;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-5 pt-8 pb-12 md:max-w-4xl">
      <Link
        href={`/livro/${livroId}/montar`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Montar o livro do {autor}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-livro text-livro-44 text-tinta leading-none">
          Folhear o livro
        </h1>
        <p className="text-ui-17 text-tinta-2">
          Assim o livro sai hoje. O que mudar na montagem aparece aqui.
        </p>
      </div>

      {estado.tipo === "carregando" ? (
        <div className="flex flex-col items-center gap-3" role="status">
          <div className="bg-polen-2 rounded-interno aspect-[154/216] w-full max-w-sm" />
          <p className="text-ui-15 text-tinta-2">
            Montando o livro de verdade…
          </p>
        </div>
      ) : null}

      {estado.tipo === "erro" ? (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-ui-17 text-erro">{estado.mensagem}</p>
          <Botao
            variante="secundario"
            onClick={() => {
              setEstado({ tipo: "carregando" });
              setRodada((n) => n + 1);
            }}
          >
            Tentar de novo
          </Botao>
        </div>
      ) : null}

      {estado.tipo === "pronto" && estado.f.total === 0 ? (
        <EstadoVazio
          frase="Ainda não há histórias prontas para folhear."
          acao={
            <Link
              href={`/livro/${livroId}/historias`}
              className={classesDoBotao()}
            >
              Ver as histórias
            </Link>
          }
        />
      ) : null}

      {estado.tipo === "pronto" && estado.f.total > 0 ? (
        <>
          {toques.length ? (
            <DicaPrimeiraVez chave="folhear-ajustar">
              Toque numa foto para ajustar.
            </DicaPrimeiraVez>
          ) : null}
          {aviso ? (
            <p className="text-ui-15 text-erro" role="alert">
              {aviso}
            </p>
          ) : null}
          <Folhear
            key={`${estado.f.hash}-${rodada}`}
            total={estado.f.total}
            capa={estado.f.capa}
            urlsIniciais={Object.fromEntries(
              estado.f.urls.map((u, i) => [estado.f.de + i, u]),
            )}
            porPedido={FOLHEAR_PAGINAS_POR_PEDIDO}
            pedir={pedir}
            areas={areasDe(toques)}
            aoTocar={(a) => void tocar(a)}
            paginaInicial={paginaInicial}
            aoMudarPagina={aoMudarPagina}
          />
          {estado.f.provisorio ? (
            <p className="text-ui-15 text-tinta-2 text-center">
              O quadrado tracejado vira o QR quando o livro for publicado.
            </p>
          ) : null}
        </>
      ) : null}

      <FolhaAjustarFoto
        foto={emAjuste?.foto ?? null}
        primeira={emAjuste?.primeira ?? false}
        aoFechar={() => setEmAjuste(null)}
        aoSalvar={salvar}
      />
    </main>
  );
}
