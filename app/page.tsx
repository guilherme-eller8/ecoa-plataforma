import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TelaConvitesPendentes } from "@/components/telas/tela-convites-pendentes";
import { TelaSemAcesso } from "@/components/telas/tela-sem-acesso";
import { nomeSeguro } from "@/lib/convite/textos";
import { livrosDoMembro, usuarioAtual } from "@/lib/sessao";
import { clienteSessao } from "@/lib/supabase/servidor";
import { sair } from "./acoes-sessao";
import { aceitarConvite } from "./convite/acoes";

// Sem sessão, o proxy.ts já mandou para /entrar. Aqui decide qual livro abrir, ou mostra
// antes os convites para o e-mail de quem entrou.
export default function Inicio() {
  return (
    <Suspense>
      <Roteador />
    </Suspense>
  );
}

async function Roteador() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  const db = await clienteSessao();
  const [[maisRecente], convites] = await Promise.all([
    livrosDoMembro(usuario.id),
    db.rpc("meus_convites"),
  ]);
  // Convite para o e-mail de quem entrou (P59): aparece antes de abrir o livro.
  if (convites.data?.length)
    return (
      <TelaConvitesPendentes
        convites={convites.data.map((c) => ({
          id: c.convite_id,
          autor: nomeSeguro(c.autor) || "alguém da família",
        }))}
        livroAtual={maisRecente?.id ?? null}
        aceitar={aceitarConvite}
      />
    );
  if (maisRecente) redirect(`/livro/${maisRecente.id}`);
  return (
    <TelaSemAcesso
      email={usuario.email}
      ehAdmin={usuario.ehAdmin}
      sair={sair}
    />
  );
}
