import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TelaSemAcesso } from "@/components/telas/tela-sem-acesso";
import { livrosDoMembro, usuarioAtual } from "@/lib/sessao";
import { sair } from "./acoes-sessao";

// Sem sessão, o proxy.ts já mandou para /entrar. Aqui só decide qual livro abrir.
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
  const [maisRecente] = await livrosDoMembro(usuario.id);
  if (maisRecente) redirect(`/livro/${maisRecente.id}`);
  return (
    <TelaSemAcesso
      email={usuario.email}
      ehAdmin={usuario.ehAdmin}
      sair={sair}
    />
  );
}
