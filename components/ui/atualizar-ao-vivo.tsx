"use client";

// Mantém uma tela do livro em dia sem a pessoa recarregar, em qualquer aparelho (T37): o canal
// privado do livro avisa na hora; uma releitura periódica cobre o que o canal perder (aba
// dormindo, rede caindo); voltar para a aba também relê. Nada aqui guarda estado: o servidor
// manda sempre (router.refresh).
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ATUALIZAR_A_CADA_S } from "@/lib/config";
import {
  EVENTO_CANAL,
  topicoDoLivro,
  type MensagemCanal,
} from "@/lib/pipeline/regras";
import { clienteNavegador } from "@/lib/supabase/navegador";

/** Assina o canal privado do livro; ao assinar, relê o servidor (o que veio antes está no banco). */
export function useCanalDoLivro(
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

/** Rajada de mensagens do canal vira uma releitura só. */
const AGRUPAR_MS = 800;

/** Relê o servidor a cada poucos segundos enquanto `ativo` e a aba estiver à vista. */
export function useRelerEnquanto(ativo: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!ativo) return;
    const reler = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(reler, ATUALIZAR_A_CADA_S * 1000);
    document.addEventListener("visibilitychange", reler);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", reler);
    };
  }, [ativo, router]);
}

/**
 * `ativo`: há áudio guardado esperando ou história sendo escrita. `canal` = false quando a
 * própria tela já assina o canal (a lista de histórias): aí só a releitura de reserva roda.
 */
export function AtualizarAoVivo({
  livroId,
  ativo,
  canal = true,
}: {
  livroId: string;
  ativo: boolean;
  canal?: boolean;
}) {
  const router = useRouter();
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (espera.current) clearTimeout(espera.current);
    },
    [],
  );
  useCanalDoLivro(
    livroId,
    () => {
      if (espera.current) return;
      espera.current = setTimeout(() => {
        espera.current = null;
        router.refresh();
      }, AGRUPAR_MS);
    },
    canal,
  );
  useRelerEnquanto(ativo);
  return null;
}
