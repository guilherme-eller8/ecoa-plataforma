import type { Metadata } from "next";
import { Suspense } from "react";
import {
  TelaMensagem,
  TelaMensagemInvalida,
} from "@/components/telas/tela-mensagem";
import { tokenValido } from "@/lib/links-formato";
import {
  esquemaPaginaDaMensagem,
  type AcoesMensagem,
} from "@/lib/mensagens/tipos";
import { clienteAdmin } from "@/lib/supabase/admin";
import * as acoes from "./acoes";

export const metadata: Metadata = {
  title: "Uma mensagem para o livro · Ecoa Memórias",
  robots: { index: false, follow: false },
};

// A transcrição roda na ação desta página (T48): o Scribe é cortado em 45 s e a reserva no banco
// dura 2 min. Com cacheComponents, só maxDuration (sem runtime/dynamic).
export const maxDuration = 60;

// Link de mensagens (P65): só escreve. A página mostra só o apelido do autor; token inválido
// mostra a frase (status 200 com noindex do proxy).
export default function PaginaMensagem({ params }: PageProps<"/m/[token]">) {
  return (
    <Suspense>
      {params.then(({ token }) => (
        <Mensagem token={token} />
      ))}
    </Suspense>
  );
}

async function Mensagem({ token }: { token: string }) {
  if (!tokenValido.safeParse(token).success) return <TelaMensagemInvalida />;
  const { data } = await clienteAdmin().rpc("servico_mensagem_pagina", {
    p_token: token,
  });
  const pagina = esquemaPaginaDaMensagem.safeParse(data);
  if (!data || !pagina.success) return <TelaMensagemInvalida />;
  const ligadas: AcoesMensagem = {
    criar: acoes.criar.bind(null, token),
    confirmarAudio: acoes.confirmarAudio.bind(null, token),
    confirmarFoto: acoes.confirmarFoto.bind(null, token),
    transcrever: acoes.transcrever.bind(null, token),
    enviar: acoes.enviar.bind(null, token),
  };
  return <TelaMensagem pagina={pagina.data} acoes={ligadas} />;
}
