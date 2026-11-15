// Dados falsos das telas do prompt 15 (aderência e erros), para o gate de design sem Supabase.
import type { Funil, LinhaDeAderencia } from "@/lib/aderencia/calculo";
import type { AcaoDaLinhaDoTempo, PessoaDoLivro } from "@/lib/aderencia/dados";
import type { ErroPorRota } from "@/lib/aderencia/erros";
import type { JobDaLista } from "@/components/telas/tela-erros";

const semanas = (valores: [number, number][]) =>
  valores.map(([autor, membros]) => ({ autor, membros }));

/** Do mais parado para o menos, como a página ordena. */
export const LINHAS_ADERENCIA: LinhaDeAderencia[] = [
  {
    id: "2",
    autorNome: "Dona Lurdes",
    passo: { feitos: 1, atual: 1 },
    paradoHaDias: 12,
    parado: true,
    autorApareceu: false,
    autorGravou: false,
    configurou: true,
    semanas: semanas([
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 0],
      [0, 0],
    ]),
  },
  {
    id: "1",
    autorNome: "Jair",
    passo: { feitos: 3, atual: 3 },
    paradoHaDias: 1,
    parado: false,
    autorApareceu: true,
    autorGravou: false,
    configurou: true,
    semanas: semanas([
      [0, 3],
      [0, 1],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]),
  },
  {
    id: "3",
    autorNome: "Seu Antônio",
    passo: { feitos: 5, atual: null },
    paradoHaDias: 0,
    parado: false,
    autorApareceu: true,
    autorGravou: true,
    configurou: true,
    semanas: semanas([
      [2, 1],
      [3, 0],
      [1, 1],
      [0, 2],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]),
  },
];

export const FUNIL_ADERENCIA: Funil = {
  livros: 3,
  configurou: 3,
  primeiraHistoria: 2,
  cincoHistorias: 1,
  publicado: null,
};

export const PESSOAS_JAIR: PessoaDoLivro[] = [
  {
    chave: "responsavel:u1",
    papel: "responsavel",
    atorId: "u1",
    nome: "ana.souza@gmail.com",
    dias: ["2026-11-14", "2026-11-13", "2026-11-10"],
    ultimo: "2026-11-14T22:10:00Z",
  },
  {
    chave: "autor:",
    papel: "autor",
    atorId: null,
    nome: "Autor",
    dias: ["2026-11-10"],
    ultimo: "2026-11-10T19:40:00Z",
  },
];

const ev = (
  criado_em: string,
  ator_tipo: string,
  acao: string,
  nome: string,
): AcaoDaLinhaDoTempo => ({
  criado_em,
  ator_tipo,
  ator_id: null,
  acao,
  book_id: "1",
  nome,
});

export const LINHA_DO_TEMPO_JAIR: AcaoDaLinhaDoTempo[] = [
  ev("2026-11-14T22:10:00Z", "responsavel", "entrou", "ana.souza@gmail.com"),
  ev("2026-11-13T18:02:00Z", "sistema", "historia_pronta", "Sistema"),
  ev("2026-11-13T17:41:00Z", "responsavel", "gravou", "ana.souza@gmail.com"),
  ev("2026-11-10T19:40:00Z", "autor", "entrou", "Autor"),
  ev("2026-11-10T19:41:00Z", "autor", "autor_consentiu", "Autor"),
  ev(
    "2026-11-10T14:00:00Z",
    "responsavel",
    "enviou_pergunta",
    "ana.souza@gmail.com",
  ),
];

export const JOBS_FALSOS: JobDaLista[] = [
  {
    quando: "2026-11-14T21:05:00Z",
    funcao: "ecoa-plataforma-processar-gravacao",
    runId: "01JABCDEF0123456789XYZ",
    autor: "Jair",
  },
  {
    quando: "2026-11-09T21:00:00Z",
    funcao: "ecoa-plataforma-resumo-semanal",
    runId: "01JZZZZZZ0123456789ABC",
    autor: null,
  },
];

export const ROTAS_COM_ERRO: ErroPorRota[] = [
  {
    rota: "/a/[token]",
    ultimas24h: 3,
    ultimos7d: 5,
    ultimo: "2026-11-15T10:20:00Z",
    tipo: "Error",
  },
  {
    rota: "/livro/[id]/historias/[historiaId]",
    ultimas24h: 0,
    ultimos7d: 1,
    ultimo: "2026-11-11T09:00:00Z",
    tipo: "TypeError",
  },
];
