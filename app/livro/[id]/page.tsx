import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { TelaLivroVazio } from "@/components/telas/tela-livro-vazio";
import { registrarEvento } from "@/lib/eventos";
import { estadoEfetivo } from "@/lib/passe";
import { livrosDoMembro, usuarioAtual } from "@/lib/sessao";

export default function PaginaLivro({ params }: PageProps<"/livro/[id]">) {
  return (
    <Suspense>
      {params.then(({ id }) => (
        <Livro id={id} />
      ))}
    </Suspense>
  );
}

async function Livro({ id }: { id: string }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  // Filtro explícito pelo membro, além da RLS.
  const livro = (await livrosDoMembro(usuario.id)).find((l) => l.id === id);
  if (!livro) notFound();

  // M10: "quem acessou o livro X ontem". Uma linha por pessoa, livro e dia.
  after(() =>
    registrarEvento(
      { quem: usuario.id, papel: livro.papel, acao: "entrou", livro: livro.id },
      { umaVezPorDia: true },
    ),
  );

  return (
    <TelaLivroVazio
      autorNome={livro.autor_nome}
      somenteLeitura={estadoEfetivo(livro) !== "ativo"}
    />
  );
}
