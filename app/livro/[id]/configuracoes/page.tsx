import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaConfiguracoes } from "@/components/telas/tela-configuracoes";
import { nomesDoLivro } from "@/lib/historias/dados";
import { livroDaPagina } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";
import {
  acrescentarNome,
  ajustarNome,
  confirmarProcessamentoIA,
  definirResumo,
} from "./acoes";
import { clienteSessao } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Configurações · Ecoa Memórias" };

export default function PaginaConfiguracoes({
  params,
}: PageProps<"/livro/[id]/configuracoes">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Configuracoes id={id} />
      ))}
    </Suspense>
  );
}

async function Configuracoes({ id }: { id: string }) {
  const { usuario, livro, podeEscrever } = await livroDaPagina(id);
  const db = await clienteSessao();
  const [tela, nomes, membro] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    nomesDoLivro(id),
    db
      .from("book_members")
      .select("resumo_semanal")
      .eq("book_id", id)
      .eq("user_id", usuario.id)
      .maybeSingle(),
  ]);
  return (
    <TelaConfiguracoes
      livro={tela}
      nomes={nomes}
      resumoLigado={membro.data?.resumo_semanal ?? true}
      acoes={{
        confirmarIA: confirmarProcessamentoIA.bind(null, id),
        ajustar: ajustarNome.bind(null, id),
        acrescentar: acrescentarNome.bind(null, id),
        definirResumo: definirResumo.bind(null, id),
      }}
    />
  );
}
