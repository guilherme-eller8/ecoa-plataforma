import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TelaConvitesPendentes } from "@/components/telas/tela-convites-pendentes";
import { TelaInicioAdmin } from "@/components/telas/tela-inicio-admin";
import { TelaSemAcesso } from "@/components/telas/tela-sem-acesso";
import { nomeSeguro } from "@/lib/convite/textos";
import { livrosDoMembro, usuarioAtual } from "@/lib/sessao";
import { clienteSessao } from "@/lib/supabase/servidor";
import { sair } from "./acoes-sessao";
import { aceitarConvite } from "./convite/acoes";

// Sem sessão, o proxy.ts já mandou para /entrar. Aqui decide qual livro abrir, ou mostra
// antes os convites para o e-mail de quem entrou. Admin escolhe entre o admin e os livros.
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
  const [livros, convites] = await Promise.all([
    livrosDoMembro(usuario.id),
    db.rpc("meus_convites"),
  ]);
  const [maisRecente] = livros;
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
  // Admin escolhe entre o admin e os próprios livros (Evals 1A); os demais vão direto ao livro.
  if (usuario.ehAdmin)
    return (
      <TelaInicioAdmin
        livros={livros.map((l) => ({
          id: l.id,
          nome: nomeSeguro(l.autor_nome) || "Livro sem nome",
          papel: l.papel,
        }))}
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
