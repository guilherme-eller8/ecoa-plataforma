"use client";

// "Gravar mais sobre isso" (prompt 9, item 3): o mesmo gravador, uma parte só (até 30 min). A
// gravação guardada no aparelho leva a história: recuperada depois, ela volta para a mesma
// história, nunca vira uma nova (P53). Design: docs/designs/ia-sob-controle.md, seção 4.5.
import Link from "next/link";
import { useMemo } from "react";
import { Gravar } from "@/components/gravacao/gravar";
import { classesDoBotao } from "@/components/ui/botao";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { enviarPorTus } from "@/lib/audios/tus";
import type { AdaptadorEnvio, SubirBlob } from "@/lib/gravacao/envio";
import { armazemIndexedDb, type Armazem } from "@/lib/gravacao/local";
import type { AcoesAudios } from "@/lib/livro/tipos";

/** As ações de áudio do livro, com a história (sem lote de conversa). */
export function adaptadorDaHistoria(
  acoes: AcoesAudios,
  historiaId: string,
): AdaptadorEnvio {
  return {
    async preparar(g, tamanho) {
      const r = await acoes.prepararAudios(
        [
          {
            nome: `mais-sobre-isso.${g.ext}`,
            tamanho,
            duracaoS: g.segundos,
            promptId: null,
            titulo: null,
          },
        ],
        { paraHistoria: { historiaId, gravado: true } },
      );
      if (!r.ok) return r;
      return { ok: true, dados: { ...r.dados[0], recebida: false } };
    },
    assinar: (g) => acoes.reassinarAudio(g.preparado!.id),
    confirmar: (g) => acoes.confirmarAudio(g.preparado!.id),
  };
}

export function TelaGravarMais({
  livroId,
  historia,
  podeEscrever,
  acoes,
  armazem,
  subir,
}: {
  livroId: string;
  historia: { id: string; titulo: string };
  podeEscrever: boolean;
  acoes: AcoesAudios;
  armazem?: Armazem;
  subir?: SubirBlob;
}) {
  const deposito = useMemo(() => armazem ?? armazemIndexedDb(), [armazem]);
  const adaptador = useMemo(
    () => adaptadorDaHistoria(acoes, historia.id),
    [acoes, historia.id],
  );
  const voltar = `/livro/${livroId}/historias/${historia.id}`;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12">
      <Link
        href={voltar}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Voltar à história
      </Link>
      {!podeEscrever ? (
        <p className="text-ui-17 text-tinta-2">
          Este livro está em somente leitura.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-ui-15 text-tinta-2">Mais sobre</p>
            <h1 className="font-livro text-livro-28 text-tinta leading-tight">
              {historia.titulo}
            </h1>
          </div>
          <Gravar
            destino={{ tipo: "historia", livroId, historiaId: historia.id }}
            promptId={null}
            emPartes={false}
            armazem={deposito}
            adaptador={adaptador}
            subir={subir ?? ((b, p, pr, i) => enviarPorTus(b, p, pr, i))}
            depois={
              <div className="flex flex-col gap-3">
                <p className="text-ui-17 text-tinta">
                  A IA vai ouvir e propor o que entra no texto.
                </p>
                <Link
                  href={voltar}
                  className={classesDoBotao({ larguraTotal: true })}
                >
                  Voltar à história
                </Link>
              </div>
            }
          />
          <DicaPrimeiraVez chave="gravar-mais">
            Conte o que faltou. Pode pausar quando quiser.
          </DicaPrimeiraVez>
        </>
      )}
    </main>
  );
}
