import type { Metadata } from "next";
import { Suspense } from "react";
import { estadoDaTelaConvite } from "@/lib/convite/estado";
import { lerConvite } from "@/lib/convite/servidor";
import { usuarioAtual } from "@/lib/sessao";
import { sair } from "../../acoes-sessao";
import {
  aceitarPeloLink,
  definirEmailDoConvite,
  receberLinkDoConvite,
} from "../acoes";
import { ConviteCliente } from "./convite-cliente";

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
  // Só o estado sai daqui: o e-mail do convite vai mascarado (lib/convite/estado.ts).
  const estado = estadoDaTelaConvite(convite, usuario?.email ?? null);
  const valido = convite.estado === "pendente";
  return (
    <ConviteCliente
      estado={estado}
      definirEmail={
        valido ? definirEmailDoConvite.bind(null, token) : undefined
      }
      receberLink={valido ? receberLinkDoConvite.bind(null, token) : undefined}
      aceitar={valido ? aceitarPeloLink.bind(null, token) : undefined}
      sair={sair}
    />
  );
}
