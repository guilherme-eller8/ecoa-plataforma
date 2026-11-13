"use client";

// O link do autor nasce por uma ação, nunca na renderização (como o da família). Na primeira
// vez que o kit ou as perguntas abrem sem link, a tela pede para criar.
import { useEffect, useState } from "react";
import type { Resposta } from "@/lib/livro/tipos";

export function useLinkDoAutor(
  inicial: string | null,
  pegar: () => Promise<Resposta<{ url: string }>>,
  podeCriar: boolean,
) {
  const [link, setLink] = useState(inicial);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    if (link || !podeCriar || falhou) return;
    let vivo = true;
    void pegar().then((r) => {
      if (!vivo) return;
      if (r.ok) setLink(r.dados.url);
      else setFalhou(true);
    });
    return () => {
      vivo = false;
    };
  }, [link, podeCriar, pegar, falhou]);
  return { link, setLink, falhou, tentarDeNovo: () => setFalhou(false) };
}

/** Link que abre direto a gravação da pergunta. */
export const linkDaPergunta = (base: string, pergunta: string) =>
  `${base}/gravar/${pergunta}`;
