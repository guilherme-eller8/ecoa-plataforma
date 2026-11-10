import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaAdmin, type LinhaAdmin } from "@/components/telas/tela-admin";
import { estadoEfetivo } from "@/lib/plano";
import { usuarioAtual } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/admin";
import { ativarPlano, reenviarAcesso, renovarPlano } from "./acoes";

export const metadata: Metadata = {
  title: "Admin · Ecoa Memórias",
  robots: { index: false },
};

// O proxy.ts já devolve 404 para quem não é admin. Aqui confere de novo antes de usar a chave secreta.
export default function PaginaAdmin() {
  return (
    <Suspense>
      <Admin />
    </Suspense>
  );
}

async function Admin() {
  const usuario = await usuarioAtual();
  if (!usuario?.ehAdmin) notFound();

  const { data, error } = await clienteAdmin().rpc("admin_listar_livros");
  if (error) throw new Error("Não deu para carregar os livros.");

  const livros: LinhaAdmin[] = (data ?? []).map((l) => ({
    id: l.id,
    autorNome: l.autor_nome,
    email: l.responsavel_email,
    estado: estadoEfetivo(l),
    venceEm: l.plano_vence_em,
  }));

  return (
    <TelaAdmin
      livros={livros}
      ativar={ativarPlano}
      renovar={renovarPlano}
      reenviar={reenviarAcesso}
    />
  );
}
