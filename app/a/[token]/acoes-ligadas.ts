import "server-only";
import type { AcoesAutor } from "@/lib/autor/tipos";
import {
  assinarGravacao,
  confirmarGravacao,
  consentir,
  prepararGravacao,
} from "./acoes";

// Liga as ações ao token da página (bind no servidor). O token já está no endereço que o
// autor abriu; cada ação confere de novo no banco.
export function acoesDoAutor(token: string): AcoesAutor {
  return {
    consentir: consentir.bind(null, token),
    preparar: prepararGravacao.bind(null, token),
    assinar: assinarGravacao.bind(null, token),
    confirmar: confirmarGravacao.bind(null, token),
  };
}
