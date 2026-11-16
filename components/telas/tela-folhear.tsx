"use client";

// Folhear o livro antes de publicar (P72): o livro como sairia hoje, do mesmo Typst do PDF
// (T20), página a página. Qualquer membro abre. Sem gravar nada: muda a montagem, muda a prévia.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Folhear } from "@/components/montar/folhear";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FOLHEAR_PAGINAS_POR_PEDIDO } from "@/lib/config";
import type { Resposta } from "@/lib/livro/tipos";

export type FolheioDaTela = {
  hash: string;
  total: number;
  capa: string | null;
  de: number;
  urls: string[];
  provisorio: boolean;
};

export type AcoesFolhear = {
  folhear: (de: number) => Promise<Resposta<FolheioDaTela>>;
};

type Estado =
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; f: FolheioDaTela };

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

  useEffect(() => {
    let vivo = true;
    void acoes.folhear(1).then((r) => {
      if (!vivo) return;
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
      if (r.ok && r.dados.hash !== hash) setRodada((n) => n + 1);
      return r;
    },
    [acoes, hash],
  );

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
          <Folhear
            key={estado.f.hash}
            total={estado.f.total}
            capa={estado.f.capa}
            urlsIniciais={Object.fromEntries(
              estado.f.urls.map((u, i) => [estado.f.de + i, u]),
            )}
            porPedido={FOLHEAR_PAGINAS_POR_PEDIDO}
            pedir={pedir}
          />
          {estado.f.provisorio ? (
            <p className="text-ui-15 text-tinta-2 text-center">
              O quadrado tracejado vira o QR quando o livro for publicado.
            </p>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
