import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import {
  TelaFamilia,
  TelaFamiliaInvalida,
} from "@/components/telas/tela-familia";
import { COOKIE_APARELHO } from "@/lib/familia/aparelho";
import { esquemaPaginaDaFamilia, type AcoesFamilia } from "@/lib/familia/tipos";
import { clienteAnonimo } from "@/lib/supabase/anonimo";
import * as acoes from "./acoes";

export const metadata: Metadata = {
  title: "Livro de memórias · Ecoa Memórias",
  robots: { index: false, follow: false },
};

// Link da família. Token inválido mostra a frase (status 200 com noindex do proxy): com
// cacheComponents, notFound() dentro do Suspense também sairia 200.
export default function PaginaFamilia({ params }: PageProps<"/f/[token]">) {
  return (
    <Suspense>
      {params.then(({ token }) => (
        <Familia token={token} />
      ))}
    </Suspense>
  );
}

async function Familia({ token }: { token: string }) {
  if (!/^v[0-9]{1,2}_[A-Za-z0-9_-]{22}$/.test(token))
    return <TelaFamiliaInvalida />;
  const aparelho = (await cookies()).get(COOKIE_APARELHO)?.value ?? "";
  const { data } = await clienteAnonimo().rpc("familia_pagina", {
    p_token: token,
    p_aparelho: aparelho,
  });
  const pagina = esquemaPaginaDaFamilia.safeParse(data);
  if (!data || !pagina.success) return <TelaFamiliaInvalida />;
  const ligadas: AcoesFamilia = {
    votar: acoes.votar.bind(null, token),
    enviarCauso: acoes.enviarCauso.bind(null, token),
    confirmarAudio: acoes.confirmarAudio.bind(null, token),
    prepararAudioDeNovo: acoes.prepararAudioDeNovo.bind(null, token),
  };
  return <TelaFamilia pagina={pagina.data} acoes={ligadas} />;
}
