import "server-only";
import type { AcoesPessoas } from "@/lib/livro/tipos";
import * as a from "./acoes";

export function acoesDePessoas(id: string): AcoesPessoas {
  return {
    convidar: a.convidar.bind(null, id),
    cancelarConvite: a.cancelarConvite.bind(null, id),
    remover: a.remover.bind(null, id),
    sair: a.sair.bind(null, id),
    trocarLinks: a.trocarLinks.bind(null, id),
  };
}
