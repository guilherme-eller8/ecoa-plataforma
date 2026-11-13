// Códigos que as funções do banco levantam (raise exception '<codigo>') e a frase da tela.
// supabase/tests/config-banco.test.ts confere que todo código do SQL está aqui.

export const FRASES_DOS_CODIGOS = {
  link_invalido: "Este link não vale mais. Peça o novo no grupo.",
  livro_fechado: "Este livro não aceita mudanças agora.",
  dados_invalidos: "Algo não está certo. Confira e tente de novo.",
  quantidade_invalida: "Escolha pelo menos uma e no máximo 2 por fase.",
  sem_enquete: "A enquete já terminou.",
  item_invalido: "Uma das opções não vale mais. Atualize a tela.",
  limite_votantes: "A enquete chegou ao limite de pessoas.",
  limite_por_hora: "Muitas mudanças agora. Tente daqui a pouco.",
  limite_causos: "Muitos causos hoje. Tente amanhã.",
  sem_consentimento: "Marque que você concorda para enviar.",
  sem_permissao: "Você não tem acesso a isso.",
  enquete_aberta: "Já tem uma enquete aberta.",
  enquete_encerrada: "Esta enquete já foi encerrada.",
  limite_itens: "A enquete já tem o máximo de opções.",
  cota_fotos: "O acervo chegou ao limite de fotos.",
  transicao_invalida: "Essa mudança não é possível.",
  link_ja_revogado: "Este link já foi trocado.",
  pergunta_invalida: "Esta pergunta não está mais disponível.",
  limite_gravacoes:
    "Muitas gravações hoje. Sua gravação está guardada e sobe mais tarde.",
  gravacao_expirada: "Esta gravação precisa ser enviada de novo.",
  versao_imutavel: "Esta versão não pode ser mudada.",
  glossario_cheio: "A lista de nomes chegou ao limite.",
  divisao_invalida: "Não deu certo agora. Atualize a tela e tente de novo.",
  divisao_ja_confirmada: "Estas histórias já foram para a escrita.",
  divisao_curta: "Uma das histórias ficou curta demais. Junte com outra.",
  divisao_longa:
    "Uma das histórias passou de 1 hora. Separe em duas para escrever.",
  divisao_limite_dia: "Hoje já foram muitas histórias. Confirme amanhã.",
} as const;

export type CodigoBanco = keyof typeof FRASES_DOS_CODIGOS;

// Erros que o Postgres levanta sozinho (constraint, cast, conflito, RLS).
const FRASES_DO_SQLSTATE: Record<string, string> = {
  "23505": "Isso já foi feito. Atualize a tela.",
  "23514": "Algo não está certo. Confira e tente de novo.",
  "22P02": "Algo não está certo. Confira e tente de novo.",
  "42501": "Este livro não aceita mudanças agora.",
};

const FRASE_GENERICA = "Não deu certo agora. Tente de novo.";

type ErroBanco = { message?: string | null; code?: string | null } | null;

/** O código nosso, quando a mensagem é exatamente um deles. */
export function codigoDoErro(erro: ErroBanco): CodigoBanco | null {
  const mensagem = erro?.message?.trim() ?? "";
  return mensagem in FRASES_DOS_CODIGOS ? (mensagem as CodigoBanco) : null;
}

/** Frase para a tela. Nunca mostra o texto cru do banco. */
export function fraseDoErro(erro: ErroBanco): string {
  const codigo = codigoDoErro(erro);
  if (codigo) return FRASES_DOS_CODIGOS[codigo];
  if (erro?.code && FRASES_DO_SQLSTATE[erro.code])
    return FRASES_DO_SQLSTATE[erro.code];
  return FRASE_GENERICA;
}
