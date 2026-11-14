import type { Metadata } from "next";
import { Suspense } from "react";
import {
  TelaConvite,
  type EstadoTelaConvite,
} from "@/components/telas/tela-convite";
import { lerConvite } from "@/lib/convite/servidor";
import { usuarioAtual } from "@/lib/sessao";
import { sair } from "../../acoes-sessao";
import { aceitarConvite } from "../acoes";

// Sem cache nem índice: o proxy põe no-store, noindex e no-referrer (T47).
export const metadata: Metadata = {
  title: "Convite · Ecoa Memórias",
  robots: { index: false, follow: false },
};

export default function PaginaConvite({
  params,
}: PageProps<"/convite/[token]">) {
  return (
    <Suspense>
      {params.then(({ token }) => (
        <Convite token={token} />
      ))}
    </Suspense>
  );
}

async function Convite({ token }: { token: string }) {
  const [convite, usuario] = await Promise.all([
    lerConvite(token),
    usuarioAtual(),
  ]);
  let estado: EstadoTelaConvite;
  if (convite.estado === "invalido") estado = { tipo: "invalido" };
  else if (!usuario)
    estado = { tipo: "entrar", quem: convite.quem, autor: convite.autor };
  else if (usuario.email?.toLowerCase() !== convite.emailConvidado)
    estado = { tipo: "outro_email", emailMascarado: convite.emailMascarado };
  else estado = { tipo: "aceitar", quem: convite.quem, autor: convite.autor };
  return (
    <TelaConvite
      estado={estado}
      aceitar={
        convite.estado === "pendente"
          ? aceitarConvite.bind(null, convite.conviteId)
          : undefined
      }
      sair={sair}
    />
  );
}
