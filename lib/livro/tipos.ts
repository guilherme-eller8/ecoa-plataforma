// Tipos que o servidor monta e as telas recebem. Sem nada de servidor aqui: as telas do
// styleguide usam os mesmos tipos com dados falsos.
import type { SituacaoDoAudio } from "@/lib/historias/tipos";
import type {
  CausoEstado,
  EnqueteEstado,
  Parentesco,
  PromptEstado,
  PromptOrigem,
  PromptTipo,
} from "@/lib/supabase/tipos";
import type { ItemDaEnquete, VotoDaEnquete } from "@/lib/enquete/ranking";
import type { Configuracao, EstadoPasso, Passo } from "./configuracao";

export type Resposta<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { dados: T }))
  | { ok: false; mensagem: string };

export type LivroDaTela = {
  id: string;
  autor: string; // apelido ou nome, como a tela mostra
  autorNome: string | null;
  autorApelido: string | null;
  autorCelular: string | null; // +5531999998888
  parentesco: Parentesco | null;
  fotoAutorUrl: string | null;
  configuracao: Configuracao;
  podeEscrever: boolean;
  ehResponsavel: boolean;
  iaConfirmada: boolean; // o responsável já confirmou o processamento com IA (P41)
};

export type PerguntaDaTela = {
  id: string;
  tipo: PromptTipo;
  texto: string;
  origem: PromptOrigem;
  bancoId: string | null;
  causoId: string | null;
  sugeridoPor: string | null; // nome de quem sugeriu o causo
  fotoUrl: string | null;
  estado: PromptEstado;
  enviadaEm: string | null;
};

export type CausoDaTela = {
  id: string;
  tipo: PromptTipo; // a família sugere pergunta ou causo
  nome: string;
  texto: string | null;
  temAudio: boolean;
  duracaoS: number | null;
  estado: CausoEstado;
  criadoEm: string;
};

export type EnqueteDaTela = {
  id: string;
  estado: EnqueteEstado;
  abertaEm: string;
  itens: ItemDaEnquete[];
  votos: VotoDaEnquete[];
};

export type FotoDaTela = {
  id: string;
  url: string;
  largura: number | null;
  altura: number | null;
  legenda: string | null;
};

export type CandidatoDaEnquete = {
  texto: string;
  tipo: PromptTipo;
  banco_id?: string;
  causo_id?: string;
};

// Upload direto do navegador ao Storage: uploadToSignedUrl(caminho, token, arquivo).
export type FotoPreparada = { caminho: string; token: string };
export type FotoSubida = { caminho: string; largura: number; altura: number };

// Ações do responsável, passadas às telas como props (o styleguide passa versões falsas).
export type AcoesConfiguracao = {
  salvarQuem: (dados: {
    nome: string;
    apelido: string;
    celular: string;
    parentesco: Parentesco | null;
  }) => Promise<Resposta>;
  salvarPerguntas: (dados: {
    bancoIds: string[];
    proprias: { tipo: PromptTipo; texto: string }[];
  }) => Promise<Resposta<{ salvas: number }>>;
  marcarPasso: (passo: Passo, estado: EstadoPasso) => Promise<Resposta>;
};

export type AcoesFotos = {
  prepararFotos: (quantidade: number) => Promise<Resposta<FotoPreparada[]>>;
  registrarFotos: (
    fotos: FotoSubida[],
    opcoes?: { doAutor?: boolean },
  ) => Promise<Resposta<{ ids: string[] }>>;
};

export type AcoesPerguntas = AcoesLinkDoAutor & {
  adicionarDoBanco: (
    bancoIds: string[],
  ) => Promise<Resposta<{ salvas: number }>>;
  adicionarPropria: (dados: {
    tipo: PromptTipo;
    texto: string;
    fotoId?: string | null;
  }) => Promise<Resposta>;
  mudarEstado: (pergunta: string, estado: PromptEstado) => Promise<Resposta>;
  apagar: (pergunta: string) => Promise<Resposta>;
  virarPergunta: (causo: string, texto: string) => Promise<Resposta>;
  porNaEnquete: (causo: string) => Promise<Resposta<{ adicionado: boolean }>>;
  urlDoAudio: (causo: string) => Promise<Resposta<{ url: string }>>;
  abrirEnquete: (candidatos: CandidatoDaEnquete[]) => Promise<Resposta>;
  encerrarEnquete: (enquete: string) => Promise<Resposta>;
  salvarDaEnquete: (
    enquete: string,
    itens: string[],
  ) => Promise<Resposta<{ salvas: number }>>;
  removerVotos: (enquete: string, votante: string) => Promise<Resposta>;
};

// ── Áudios recebidos (prompt 5A) ─────────────────────────────────────────
export type OrigemAudio = "autor" | "livre" | "conversa" | "upload" | "lote";

export type AudioDaTela = {
  id: string;
  origem: OrigemAudio;
  titulo: string | null;
  nomeArquivo: string;
  pergunta: string | null; // texto da pergunta ligada
  duracaoS: number | null;
  tamanhoBytes: number;
  recebidoEm: string;
  url: string | null; // assinada por 1 h
  processado: boolean;
  situacao?: SituacaoDoAudio; // prompt 6: virou história ou por que espera
};

export type AudioParaSubir = {
  nome: string;
  tamanho: number;
  duracaoS: number | null;
  promptId: string | null;
  titulo: string | null;
};

// Upload retomável direto ao Storage: TUS com o token no cabeçalho x-signature.
export type AudioPreparado = {
  id: string;
  caminho: string;
  token: string;
  contentType: string;
};

export type OpcoesAudios = { conversa?: { loteId: string } };

export type AcoesAudios = {
  prepararAudios: (
    arquivos: AudioParaSubir[],
    opcoes?: OpcoesAudios,
  ) => Promise<Resposta<AudioPreparado[]>>;
  reassinarAudio: (id: string) => Promise<Resposta<AudioPreparado>>;
  confirmarAudio: (id: string) => Promise<Resposta>;
};

export type AcoesLinkDoAutor = {
  pegarLinkDoAutor: () => Promise<Resposta<{ url: string }>>;
};

export type AcoesKit = AcoesLinkDoAutor & {
  trocarLinkDoAutor: () => Promise<Resposta<{ url: string }>>;
  pegarLinkDaFamilia: () => Promise<Resposta<{ url: string }>>;
  trocarLinkDaFamilia: () => Promise<Resposta<{ url: string }>>;
};
