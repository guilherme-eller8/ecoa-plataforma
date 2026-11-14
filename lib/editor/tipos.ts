// Ações do editor (prompt 8), passadas às telas como props: o styleguide passa versões falsas.
import type { AcoesAmostra } from "@/components/editor/folha-amostra";
import type { Marcacao } from "@/lib/ai/schemas";
import type { FotoDaHistoria } from "@/lib/historias/tipos";
import type {
  AcoesAudios,
  AcoesFotos,
  FotoDaTela,
  Resposta,
} from "@/lib/livro/tipos";
import type { ChaveTamanho } from "@/lib/ui/tamanho";
import type { Paragrafo, TextoDaHistoria } from "./conteudo";
import type { EstadoProposta, Proposta } from "./propostas";

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
  /** Prompt 9: sem elas (styleguide antigo), as ferramentas da IA não aparecem. */
  propostas?: AcoesPropostas;
  /** Prompt 10: página de amostra (só em história marcada como pronta). */
  amostra?: AcoesAmostra;
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

// ── Propostas da IA (prompt 9) ───────────────────────────────────────────

export type PropostaDaTela = Proposta & {
  estado: EstadoProposta;
  tamanho: ChaveTamanho;
  erro: string | null;
  pedidaEm: string;
};

export type PedidoDeTrecho = {
  paragrafo: string;
  inicio: number; // UTF-16, como a tela vê; o servidor converte para o banco
  fim: number;
  instrucao: "curto" | "fiel" | "corrigir" | "livre";
  texto?: string;
};

export type AcoesPropostas = {
  pedirTamanho: (
    aba: string,
    tamanho: ChaveTamanho,
  ) => Promise<Resposta<PropostaDaTela>>;
  revisarTrecho: (
    aba: string,
    pedido: PedidoDeTrecho,
  ) => Promise<Resposta<PropostaDaTela>>;
  usarAudio: (aba: string) => Promise<Resposta<PropostaDaTela>>;
  /** As propostas que a tela mostra (gerando, prontas e a que falhou há pouco). */
  pendentes: () => Promise<Resposta<PropostaDaTela[]>>;
  aplicarProposta: (
    aba: string,
    rev: number,
    proposta: string,
    aceitas: string[],
  ) => Promise<
    Resposta<{ rev: number; paragrafos: Paragrafo[]; marcacoes: Marcacao[] }>
  >;
  descartarProposta: (aba: string, proposta: string) => Promise<Resposta>;
  /** Subir mais um áudio: as ações de áudio do livro, com a história. */
  audios: AcoesAudios;
};
