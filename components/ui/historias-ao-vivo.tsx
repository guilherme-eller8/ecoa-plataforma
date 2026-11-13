"use client";

// Cartões de história com as etapas e o texto ao vivo (M5, T37). O estado verdadeiro vem do
// servidor (props); o canal privado do livro só adianta o que já mudou. Ao assinar o canal e a
// cada etapa nova, a tela relê o servidor (router.refresh).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { estadoDoCartao } from "@/lib/historias/etapas";
import { andamento as andamentoPrevisto } from "@/lib/historias/previsao";
import type { HistoriaDaTela } from "@/lib/historias/tipos";
import {
  EVENTO_CANAL,
  topicoDoLivro,
  type EtapaPublicada,
  type MensagemCanal,
} from "@/lib/pipeline/regras";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { classesDoBotao } from "./botao";
import { CartaoHistoria } from "./cartao-historia";

export type AoVivo = {
  etapa?: EtapaPublicada;
  tentativa: number;
  titulo: string | null;
  paragrafos: string[];
};

const ORIGEM: Record<string, string> = {
  autor: "Gravada pelo link",
  livre: "Gravada pelo link",
  upload: "Áudio enviado",
  conversa: "Conversa",
  lote: "Áudios enviados",
};

function useCanalDoLivro(
  livroId: string,
  aoReceber: (m: MensagemCanal) => void,
  ligado: boolean,
) {
  const router = useRouter();
  const receber = useRef(aoReceber);
  useEffect(() => {
    receber.current = aoReceber;
  });
  useEffect(() => {
    if (!ligado) return;
    const supabase = clienteNavegador();
    let vivo = true;
    let canal: ReturnType<typeof supabase.channel> | null = null;
    void supabase.realtime.setAuth().then(() => {
      if (!vivo) return;
      canal = supabase
        .channel(topicoDoLivro(livroId), { config: { private: true } })
        .on("broadcast", { event: EVENTO_CANAL }, ({ payload }) =>
          receber.current(payload as MensagemCanal),
        )
        .subscribe((status) => {
          // O que aconteceu antes de assinar está no banco.
          if (status === "SUBSCRIBED") router.refresh();
        });
    });
    return () => {
      vivo = false;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [livroId, router, ligado]);
}

export function HistoriasAoVivo({
  livroId,
  historias,
  marcarVista,
  vazio,
  canal = true,
  inicial = {},
}: {
  livroId: string;
  historias: HistoriaDaTela[];
  marcarVista: (historia: string) => Promise<void>;
  vazio?: React.ReactNode;
  canal?: boolean; // false na vitrine (sem Supabase)
  inicial?: Record<string, AoVivo>; // vitrine: texto ao vivo de exemplo
}) {
  const router = useRouter();
  const [aoVivo, setAoVivo] = useState<Record<string, AoVivo>>(inicial);
  // Relógio só no navegador (o servidor não sabe a hora da tela) e só com algo em andamento.
  const [agora, setAgora] = useState<number | null>(null);
  const emAndamento = historias.some(
    (h) =>
      h.estado === "ouvindo" ||
      h.estado === "escrevendo" ||
      h.estado === "dividindo",
  );
  useEffect(() => {
    if (!emAndamento) return;
    const tic = () => setAgora(Date.now());
    tic();
    const id = setInterval(tic, 1000);
    return () => clearInterval(id);
  }, [emAndamento]);
  const vistas = useRef(new Set<string>());

  const ver = (id: string) => {
    if (vistas.current.has(id) || document.visibilityState !== "visible")
      return;
    vistas.current.add(id);
    void marcarVista(id);
  };

  // Quem abre a tela com uma história recém-pronta também conta como "viu" (P42).
  useEffect(() => {
    for (const h of historias) if (h.estado === "pronta" && !h.vista) ver(h.id);
  });

  useCanalDoLivro(
    livroId,
    (m) => {
      if (!historias.some((h) => h.id === m.historia)) router.refresh();
      setAoVivo((atual) => {
        const antes = atual[m.historia] ?? {
          tentativa: 0,
          titulo: null,
          paragrafos: [],
        };
        if (m.tipo === "etapa")
          return { ...atual, [m.historia]: { ...antes, etapa: m.etapa } };
        if (m.tentativa < antes.tentativa) return atual;
        return {
          ...atual,
          [m.historia]: {
            ...antes,
            etapa: antes.etapa ?? "escrevendo",
            tentativa: m.tentativa,
            titulo: m.titulo,
            paragrafos: m.paragrafos,
          },
        };
      });
      if (
        m.tipo === "etapa" &&
        (m.etapa === "revisar" ||
          m.etapa === "falhou" ||
          m.etapa === "conferir")
      ) {
        if (m.etapa === "revisar") ver(m.historia);
        router.refresh();
      }
    },
    canal,
  );

  if (historias.length === 0) return <>{vazio}</>;

  return (
    <ul className="flex flex-col gap-4">
      {historias.map((h) => {
        const vivo = aoVivo[h.id];
        const doServidor = estadoDoCartao(h.estado, h.revisada);
        // O servidor manda quando já chegou mais longe que o canal (ex.: depois de um refresh).
        // Prompt 7: em "conferir" o servidor também manda; e uma história que já passou pela
        // divisão não volta para "separando"/"conferir" por uma mensagem velha do canal.
        const velha =
          h.dividida &&
          (vivo?.etapa === "separando" || vivo?.etapa === "conferir");
        const estado =
          h.estado === "pronta" ||
          h.estado === "falhou" ||
          h.estado === "separar"
            ? doServidor
            : velha
              ? doServidor
              : (vivo?.etapa ?? doServidor);
        const escrevendo = estado === "escrevendo";
        const trecho = escrevendo
          ? vivo?.paragrafos.slice(-2).join("\n\n") || undefined
          : (h.trecho ?? undefined);
        return (
          <li key={h.id}>
            <CartaoHistoria
              titulo={h.titulo ?? vivo?.titulo ?? null}
              estado={estado}
              origem={
                h.pergunta
                  ? `Responde: ${h.pergunta}`
                  : h.gravacoes > 1 && h.origem === "lote"
                    ? `${h.gravacoes} áudios`
                    : (ORIGEM[h.origem ?? ""] ?? "Áudio")
              }
              duracaoSeg={h.duracaoS}
              propostas={h.propostas}
              andamento={
                agora !== null &&
                (estado === "ouvindo" ||
                  estado === "escrevendo" ||
                  estado === "separando")
                  ? andamentoPrevisto(
                      estado,
                      h.duracaoS,
                      (agora - new Date(h.criadaEm).getTime()) / 1000,
                    )
                  : undefined
              }
              trecho={trecho}
              destaque={
                estado === "ouvindo" ||
                escrevendo ||
                estado === "separando" ||
                estado === "conferir"
              }
              acao={
                estado === "conferir" ? (
                  <Link
                    href={`/livro/${livroId}/historias/${h.id}/dividir`}
                    className={classesDoBotao()}
                  >
                    Conferir
                  </Link>
                ) : estado === "revisar" || estado === "pronta" ? (
                  <Link
                    href={`/livro/${livroId}/historias/${h.id}`}
                    className="text-ui-17 text-floresta min-h-alvo inline-flex items-center font-medium underline-offset-4 hover:underline"
                  >
                    {estado === "revisar" ? "Revisar" : "Abrir"}
                  </Link>
                ) : undefined
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
