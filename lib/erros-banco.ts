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
  trava_de_outro: "Outra tela está editando esta história agora.",
  texto_desatualizado: "O texto mudou em outra tela. Atualize para continuar.",
  cota_fotos_historia: "Cada história tem no máximo 4 fotos.",
  travado_alterado:
    "Um parágrafo que você editou mudou. Atualize a tela e peça de novo.",
  proposta_vencida: "O texto mudou depois do pedido. Peça de novo.",
  proposta_indisponivel: "Esta proposta já foi decidida. Atualize a tela.",
  proposta_em_andamento: "Espere a proposta que já está sendo escrita.",
  cota_ia_diaria: "A IA já ajudou muito hoje neste livro. Tente amanhã.",
  // Prompt 10: QR e página de amostra.
  historia_nao_pronta: "Marque a história como pronta para gerar a página.",
  historia_sem_audio: "Esta história não tem áudio para o QR.",
  historia_audio_compartilhado:
    "Esta história divide o áudio com outra. Fale com a Ecoa.",
  qr_colisao: "Não deu certo agora. Tente de novo.",
  qr_desativado:
    "O QR desta história está desligado. Ligue de novo para gerar a página.",
  qr_recorte_longo: "Não deu certo agora. Tente de novo.",
  qr_imutavel: "Este QR não pode mudar.",
  // Prompt 11: co-facilitadores e compartilhar.
  ja_membro: "Esta pessoa já ajuda no livro.",
  limite_convites: "Muitos convites hoje. Tente amanhã.",
  limite_cofacilitadores:
    "O livro já tem 5 pessoas ajudando. Cancele um convite para abrir vaga.",
  convite_invalido: "Este convite não vale mais. Peça um novo a quem convidou.",
  compartilhar_nao_pronta: "Marque a história como pronta para compartilhar.",
  limite_mensagens: "Muitas mensagens hoje. Tente amanhã.",
  mensagem_nao_encontrada:
    "O tempo para enviar esta mensagem acabou. Comece de novo.",
  mensagem_sem_texto: "Escreva a mensagem antes.",
  audio_nao_chegou: "O áudio não chegou. Tente de novo.",
  limite_transcricao:
    "Não conseguimos escrever o áudio. Escreva a mensagem você mesmo.",
  mensagem_imutavel: "Esta mensagem não pode mudar.",
  limite_rascunhos: "Termine ou espere as mensagens que você já começou.",
  audio_longo: "O áudio passou de 5 minutos. Grave de novo, mais curto.",
  family_messages_nao_vazia: "Algo não está certo. Confira e tente de novo.",
  qr_nao_encontrado: "Não achamos este QR.",
  chave_invalida: "Não deu certo agora. Tente de novo.",
  reversao_com_qr: "Não deu certo agora. Tente de novo.",
  // Prompt 13: montar e publicar o livro.
  montagem_mudou: "O livro mudou enquanto você conferia. Confira de novo.",
  publicacao_em_andamento:
    "Já tem uma publicação sendo preparada. Espere ela terminar.",
  limite_publicacoes: "Muitas publicações hoje. Tente amanhã.",
  livro_vazio: "Ponha pelo menos uma história ou mensagem no livro.",
  livro_sem_titulo: "Dê um título ao livro na capa.",
  historia_sem_titulo: "Uma das histórias está sem título.",
  qr_nao_conferido: "Não deu certo desta vez. Publique de novo.",
  export_imutavel: "Esta versão publicada não pode ser mudada.",
  mensagem_publicada:
    "Esta mensagem já está num livro publicado. Fale com a Ecoa para tirá-la.",
  // Prompt 14: compra pelo Mercado Pago (P77, T58).
  compra_teto_email:
    "Muitas tentativas com este e-mail hoje. Tente amanhã ou fale com a gente.",
  compra_inexistente: "Não achamos esta compra.",
  compra_sem_responsavel: "Não deu certo agora. Tente de novo.",
  compra_acao_invalida: "Não deu certo agora. Tente de novo.",
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
