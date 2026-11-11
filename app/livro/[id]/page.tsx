import { redirect } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { TelaLivro } from "@/components/telas/tela-livro";
import { marcarHistoriaVista } from "./historias/acoes";
import { registrarEvento } from "@/lib/eventos";
import { historiasDoLivro } from "@/lib/historias/dados";
import { livroDaPagina } from "@/lib/livro/acesso";
import { precisaConfigurar } from "@/lib/livro/configuracao";
import {
  causosDoLivro,
  enqueteDoLivro,
  linkDaFamilia,
  livroDaTela,
  perguntasDoLivro,
  totalDeAudios,
} from "@/lib/livro/dados";

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
  const { usuario, livro, podeEscrever } = await livroDaPagina(id);
  const tela = await livroDaTela(livro, podeEscrever);
  if (precisaConfigurar(tela.configuracao, podeEscrever))
    redirect(`/livro/${id}/configurar/quem`);

  // M10: "quem acessou o livro X ontem". Uma linha por pessoa, livro e dia.
  after(() =>
    registrarEvento(
      { quem: usuario.id, papel: livro.papel, acao: "entrou", livro: livro.id },
      { umaVezPorDia: true },
    ),
  );

  const [perguntas, causos, enquete, audios, historias, familia] =
    await Promise.all([
      perguntasDoLivro(id),
      causosDoLivro(id),
      enqueteDoLivro(id),
      totalDeAudios(id),
      historiasDoLivro(id, 20),
      linkDaFamilia(id),
    ]);
  return (
    <TelaLivro
      livro={tela}
      resumo={{
        paraPerguntar: perguntas.filter((p) => p.estado === "para_enviar")
          .length,
        causosNovos: causos.filter((c) => c.estado === "novo").length,
        enqueteAberta: enquete?.estado === "aberta",
        audios,
      }}
      historias={historias}
      linkFamilia={familia}
      marcarVista={marcarHistoriaVista.bind(null, id)}
    />
  );
}
