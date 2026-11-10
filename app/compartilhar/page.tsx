import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TelaCompartilhar } from "@/components/telas/tela-compartilhar";
import { nomeDoAutor } from "@/lib/livro/acesso";
import { livroDaTela, perguntasDoLivro } from "@/lib/livro/dados";
import { podeEscrever } from "@/lib/plano";
import { livrosDoMembro, usuarioAtual } from "@/lib/sessao";
import { acoesDoLivro } from "../livro/[id]/ligar-acoes";

export const metadata: Metadata = {
  title: "Áudios do WhatsApp · Ecoa Memórias",
};

// Destino do Compartilhar do Android (o service worker guardou os arquivos no aparelho).
export default function PaginaCompartilhar({
  searchParams,
}: PageProps<"/compartilhar">) {
  return (
    <Suspense>
      {searchParams.then((busca) => (
        <Compartilhar
          livroId={typeof busca.livro === "string" ? busca.livro : null}
          erro={busca.erro === "1"}
        />
      ))}
    </Suspense>
  );
}

async function Compartilhar({
  livroId,
  erro,
}: {
  livroId: string | null;
  erro: boolean;
}) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  const livros = await livrosDoMembro(usuario.id);
  const escolhido =
    livros.find((l) => l.id === livroId) ??
    (livros.length === 1 ? livros[0] : null);
  if (!escolhido)
    return (
      <TelaCompartilhar
        livro={null}
        livros={livros.map((l) => ({ id: l.id, autor: nomeDoAutor(l) }))}
        perguntas={[]}
        acoes={null}
        erro={erro}
      />
    );
  const pode = podeEscrever(escolhido);
  const [tela, perguntas] = await Promise.all([
    livroDaTela(escolhido, pode),
    perguntasDoLivro(escolhido.id),
  ]);
  return (
    <TelaCompartilhar
      livro={tela}
      livros={[]}
      perguntas={perguntas.filter(
        (p) => p.estado === "para_enviar" || p.estado === "enviada",
      )}
      acoes={acoesDoLivro(escolhido.id).audios}
      erro={erro}
    />
  );
}
