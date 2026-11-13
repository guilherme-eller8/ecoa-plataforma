// Ações do editor (prompt 8), passadas às telas como props: o styleguide passa versões falsas.
import type { Marcacao } from "@/lib/ai/schemas";
import type { FotoDaHistoria } from "@/lib/historias/tipos";
import type { AcoesFotos, FotoDaTela, Resposta } from "@/lib/livro/tipos";
import type { TextoDaHistoria } from "./conteudo";

export type EstadoTrava = {
  editando: boolean; // esta tela edita
  outraTela: boolean; // a própria pessoa edita em outra tela
  nome: string | null; // quem edita (outra pessoa)
};

export type FalhaSalvar = "trava" | "desatualizado" | "rede" | "outro";

export type RespostaSalvar =
  | { ok: true; rev: number }
  | { ok: false; motivo: FalhaSalvar; mensagem: string };

export type AcoesEditor = AcoesFotos & {
  editar: (
    aba: string,
    opcoes: { pegar: boolean; assumir?: boolean },
  ) => Promise<Resposta<EstadoTrava>>;
  salvar: (
    aba: string,
    rev: number,
    texto: TextoDaHistoria,
    marcacoes: Marcacao[],
  ) => Promise<RespostaSalvar>;
  pararDeEditar: (aba: string) => Promise<void>;
  marcarPronta: (pronta: boolean) => Promise<Resposta>;
  acervo: () => Promise<Resposta<FotoDaTela[]>>;
  ligarFotos: (ids: string[]) => Promise<Resposta<{ fotos: FotoDaHistoria[] }>>;
  tirarFoto: (id: string) => Promise<Resposta>;
  legendar: (id: string, legenda: string) => Promise<Resposta>;
  responderSugestao?: (aceitar: boolean) => Promise<Resposta>;
};

export type AcoesVersoes = {
  restaurar: (
    aba: string,
    numero: number,
  ) => Promise<Resposta<{ rev: number }>>;
};

/** Uma aba (tela) por guia do navegador: o editor e o histórico usam a mesma. */
export function abaDestaGuia(): string {
  try {
    const atual = sessionStorage.getItem("ecoa-aba");
    if (atual && /^[0-9a-f-]{36}$/.test(atual)) return atual;
    const nova = crypto.randomUUID();
    sessionStorage.setItem("ecoa-aba", nova);
    return nova;
  } catch {
    return crypto.randomUUID();
  }
}
