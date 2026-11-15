// Liga as ações do servidor ao livro da página (o mesmo padrão das outras rotas do livro).
import type { AcoesMontar } from "@/lib/livro/montar-tipos";
import * as acoes from "./acoes";

export function acoesDaMontagem(id: string): AcoesMontar {
  return {
    salvar: acoes.salvarMontagem.bind(null, id),
    mensagemNoLivro: acoes.mensagemNoLivro.bind(null, id),
    contar: acoes.contarPaginas.bind(null, id),
    previaCapa: acoes.previaCapa.bind(null, id),
    publicar: acoes.publicar.bind(null, id),
  };
}
