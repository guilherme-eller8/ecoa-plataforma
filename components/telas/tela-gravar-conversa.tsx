"use client";

// Gravar conversa (modo conversa, M4): o filho grava no próprio celular, com a pergunta no
// topo como roteiro ou em conversa livre. Passo 1 escolhe; passo 2 grava.
import Link from "next/link";
import { useMemo, useState } from "react";
import { Gravar } from "@/components/gravacao/gravar";
import { classesDoBotao } from "@/components/ui/botao";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { enviarPorTus } from "@/lib/audios/tus";
import type { AdaptadorEnvio, SubirBlob } from "@/lib/gravacao/envio";
import { armazemIndexedDb, type Armazem } from "@/lib/gravacao/local";
import type {
  AcoesAudios,
  LivroDaTela,
  PerguntaDaTela,
} from "@/lib/livro/tipos";

const LIVRE = "livre";

/** As ações do 5A, vistas pela fila de envio do gravador. */
export function adaptadorDoLivro(acoes: AcoesAudios): AdaptadorEnvio {
  return {
    async preparar(g, tamanho) {
      const r = await acoes.prepararAudios(
        [
          {
            nome: `conversa-parte-${g.parte}.${g.ext}`,
            tamanho,
            duracaoS: g.segundos,
            promptId: g.promptId,
            titulo: null,
          },
        ],
        { conversa: { loteId: g.loteId ?? g.id } },
      );
      if (!r.ok) return r;
      const p = r.dados[0];
      return { ok: true, dados: { ...p, recebida: false } };
    },
    assinar: (g) => acoes.reassinarAudio(g.preparado!.id),
    confirmar: (g) => acoes.confirmarAudio(g.preparado!.id),
  };
}

export function TelaGravarConversa({
  livro,
  perguntas,
  acoes,
  perguntaInicial = null,
  armazem,
  subir,
  limiteParteS,
}: {
  livro: LivroDaTela;
  perguntas: PerguntaDaTela[]; // para perguntar e enviadas
  acoes: AcoesAudios;
  perguntaInicial?: string | null;
  armazem?: Armazem;
  subir?: SubirBlob;
  limiteParteS?: number;
}) {
  const [escolha, setEscolha] = useState<string | null>(
    perguntaInicial && perguntas.some((p) => p.id === perguntaInicial)
      ? perguntaInicial
      : null,
  );
  const deposito = useMemo(() => armazem ?? armazemIndexedDb(), [armazem]);
  const adaptador = useMemo(() => adaptadorDoLivro(acoes), [acoes]);
  const pergunta = perguntas.find((p) => p.id === escolha) ?? null;
  const voltar = `/livro/${livro.id}/historias/nova`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12">
      {escolha === null ? (
        <Link
          href={voltar}
          className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
        >
          ← Nova história
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setEscolha(null)}
          className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
        >
          ← Trocar a pergunta
        </button>
      )}

      {!livro.podeEscrever ? (
        <p className="text-ui-17 text-tinta-2">
          Este livro está em somente leitura.
        </p>
      ) : escolha === null ? (
        <>
          <h1 className="font-livro text-livro-28 text-tinta leading-tight">
            Sobre o que vão conversar?
          </h1>
          <ul className="flex flex-col gap-3">
            <li>
              <button
                type="button"
                onClick={() => setEscolha(LIVRE)}
                className="rounded-cartao border-linha-forte bg-papel text-ui-17 text-tinta hover:bg-polen-2 min-h-alvo w-full border px-5 py-4 text-left font-medium"
              >
                Conversa livre, sem pergunta
              </button>
            </li>
            {perguntas.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setEscolha(p.id)}
                  className="rounded-cartao border-linha bg-papel font-livro text-livro-20 text-tinta hover:bg-polen-2 min-h-alvo w-full border px-5 py-4 text-left leading-snug"
                >
                  {p.texto}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h1 className="font-livro text-livro-28 text-tinta leading-tight">
            {pergunta?.texto ?? "Conversa livre"}
          </h1>
          <DicaPrimeiraVez chave="gravar-conversa">
            Deixe o celular na mesa, perto de quem fala.
          </DicaPrimeiraVez>
          <Gravar
            destino={{ tipo: "livro", livroId: livro.id }}
            promptId={pergunta?.id ?? null}
            emPartes
            limiteParteS={limiteParteS}
            armazem={deposito}
            adaptador={adaptador}
            subir={subir ?? ((b, p, pr, i) => enviarPorTus(b, p, pr, i))}
            depois={
              <div className="flex flex-col gap-3">
                <Link
                  href={`/livro/${livro.id}/audios`}
                  className={classesDoBotao({ larguraTotal: true })}
                >
                  Ver áudios recebidos
                </Link>
                <Link
                  href={voltar}
                  className={classesDoBotao({
                    variante: "texto",
                  })}
                >
                  Gravar outra
                </Link>
              </div>
            }
          />
        </>
      )}
    </main>
  );
}
