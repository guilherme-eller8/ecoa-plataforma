// Tipos que o servidor monta e as telas de montagem recebem (sem nada de servidor aqui: o
// styleguide usa os mesmos tipos com dados falsos).
import type { CorDaCapa } from "@/lib/config";
import type { Alerta } from "./alertas";
import type { Resposta } from "./tipos";

export type PassoDaMontagem = "conteudo" | "capa" | "conferir";

export type HistoriaNaMontagem = {
  id: string;
  titulo: string | null;
  ano: number | null;
  revisada: boolean;
  incluida: boolean;
  palavras: number;
  comQr: boolean;
};

export type MensagemNaMontagem = {
  id: string;
  nome: string;
  relacao: string;
  incluida: boolean;
  previa: string;
  comQr: boolean;
};

export type VersaoDaTela = {
  id: string;
  versao: number;
  estado: "gerando" | "pronta" | "falhou";
  paginas: number | null;
  criadoEm: string;
};

export type FotoParaCapa = {
  id: string;
  url: string;
  largura: number | null;
  altura: number | null;
};

export type MontagemDaTela = {
  rev: number; // 0 = a montagem ainda não existe
  hash: string; // o que a pessoa viu; vai de volta no Publicar (design 5.1)
  titulo: string; // já com "Histórias de {apelido}" quando ninguém escolheu
  tituloEscolhido: boolean;
  subtitulo: string;
  dedicatoria: string;
  capaCor: CorDaCapa;
  capaFotoId: string | null;
  capaFocoX: number; // 0 a 100, % da foto (50 = centro)
  capaFocoY: number;
  capaFotoUrl: string | null;
  fotos: FotoParaCapa[];
  historias: HistoriaNaMontagem[]; // na ordem do livro
  mensagens: MensagemNaMontagem[];
  alertas: Alerta[]; // sem o do título da capa: esse vem da contagem
  proximaVersao: number;
  versoes: VersaoDaTela[];
  responsavel: string | null; // quem publica, para o "Só Ana publica."
  paginasIniciais: number | null;
};

export type EntradaMontagem = {
  rev: number;
  titulo: string;
  subtitulo: string;
  dedicatoria: string;
  capaFotoId: string | null;
  capaCor: CorDaCapa;
  capaFocoX: number;
  capaFocoY: number;
  ordemHistorias: string[];
  ordemMensagens: string[];
  fora: string[];
};

export type ContagemDoLivro = {
  paginas: number;
  extras: number;
  hash: string;
  linhasDoTitulo: number;
  alertas: Alerta[];
};

export type AcoesMontar = {
  salvar: (e: EntradaMontagem) => Promise<Resposta<{ rev: number }>>;
  mensagemNoLivro: (id: string, incluir: boolean) => Promise<Resposta>;
  contar: () => Promise<Resposta<ContagemDoLivro>>;
  previaCapa: (e: {
    titulo: string;
    subtitulo: string;
    fotoId: string | null;
    focoX: number;
    focoY: number;
    cor: CorDaCapa;
    paginas: number;
  }) => Promise<Resposta<{ imagem: string }>>;
  publicar: (hash: string) => Promise<Resposta<{ versao: number }>>;
};

export type VersaoPublicada = {
  id: string;
  versao: number;
  estado: "gerando" | "pronta" | "falhou";
  paginas: number | null;
  lombadaMm: number | null;
  criadoEm: string;
  qrEsperados: number;
  vozesProntas: number;
  capaUrl: string | null;
  previasUrls: string[]; // as primeiras páginas (as outras vêm por demanda)
};

export type AcoesVersao = {
  estado: () => Promise<Resposta<VersaoPublicada>>;
  previas: (de: number) => Promise<Resposta<{ urls: string[] }>>;
  baixar: (arquivo: "miolo" | "capa") => Promise<Resposta<{ url: string }>>;
};
