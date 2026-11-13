import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaEditor } from "@/components/telas/tela-editor";
import { TelaHistoria } from "@/components/telas/tela-historia";
import {
  confirmarAudio,
  prepararAudios,
  prepararFotos,
  reassinarAudio,
  registrarFotos,
  responderSugestao,
} from "@/app/livro/[id]/acoes";
import * as editor from "@/app/livro/[id]/historias/editor-acoes";
import * as propostas from "@/app/livro/[id]/historias/propostas-acoes";
import { historiaParaEditar, historiaParaLer } from "@/lib/historias/dados";
import { livroDaPagina, nomeDoAutor } from "@/lib/livro/acesso";
import { livroDaTela } from "@/lib/livro/dados";

export const metadata: Metadata = { title: "História · Ecoa Memórias" };

// Prompt 9: "Revisar" roda na própria ação (2 chamadas do modelo capaz, com novas tentativas).
export const maxDuration = 120;

export default function PaginaHistoria({
  params,
}: PageProps<"/livro/[id]/historias/[historiaId]">) {
  return (
    <Suspense>
      {params.then(({ id, historiaId }) => (
        <Historia id={id} historiaId={historiaId} />
      ))}
    </Suspense>
  );
}

async function Historia({
  id,
  historiaId,
}: {
  id: string;
  historiaId: string;
}) {
  const { livro, podeEscrever } = await livroDaPagina(id);
  // Prompt 8: história pronta abre no editor; as outras, na tela de acompanhar (prompt 6).
  const paraEditar = await historiaParaEditar(
    id,
    historiaId,
    nomeDoAutor(livro),
  );
  if (paraEditar)
    return (
      <TelaEditor
        historia={paraEditar}
        podeEscrever={podeEscrever}
        acoes={{
          editar: editor.editar.bind(null, id, historiaId),
          salvar: editor.salvar.bind(null, id, historiaId),
          pararDeEditar: editor.pararDeEditar.bind(null, id, historiaId),
          marcarPronta: editor.marcarPronta.bind(null, id, historiaId),
          acervo: editor.acervo.bind(null, id),
          ligarFotos: editor.ligarFotos.bind(null, id, historiaId),
          tirarFoto: editor.tirarFoto.bind(null, id, historiaId),
          legendar: editor.legendar.bind(null, id, historiaId),
          prepararFotos: prepararFotos.bind(null, id),
          registrarFotos: registrarFotos.bind(null, id),
          responderSugestao: responderSugestao.bind(null, id, historiaId),
          propostas: {
            pedirTamanho: propostas.pedirTamanho.bind(null, id, historiaId),
            revisarTrecho: propostas.revisarTrecho.bind(null, id, historiaId),
            usarAudio: propostas.usarAudio.bind(null, id, historiaId),
            pendentes: propostas.pendentes.bind(null, id, historiaId),
            aplicarProposta: propostas.aplicarProposta.bind(
              null,
              id,
              historiaId,
            ),
            descartarProposta: propostas.descartarProposta.bind(
              null,
              id,
              historiaId,
            ),
            audios: {
              prepararAudios: prepararAudios.bind(null, id),
              reassinarAudio: reassinarAudio.bind(null, id),
              confirmarAudio: confirmarAudio.bind(null, id),
            },
          },
        }}
      />
    );
  const [tela, historia] = await Promise.all([
    livroDaTela(livro, podeEscrever),
    historiaParaLer(id, historiaId),
  ]);
  if (!historia) notFound();
  return (
    <TelaHistoria
      livro={tela}
      historia={historia}
      responderSugestao={responderSugestao.bind(null, id, historiaId)}
    />
  );
}
