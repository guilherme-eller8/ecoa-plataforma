// Fonte única de configuração da plataforma. Preço, limites, formato do livro e domínios saem daqui.
// Mudou um número de negócio? Muda só aqui.

export const MARCA = "Ecoa Memórias";

// ── Plano ────────────────────────────────────────────────────────────────
// R$ 467 por ano: gravações ilimitadas e 1 livro de 80 páginas.
export const PRECO_PLANO = 467; // exibir como "R$ 467"
export const DURACAO_PLANO_MESES = 12; // conta a partir da ativação

// ── Livro ────────────────────────────────────────────────────────────────
export const PAGINAS_INCLUSAS = 80;
// A definir pela cotação da gráfica (pendência do fundador). null = ainda não definido;
// a interface não deve mostrar valor enquanto for null.
export const VALOR_PAGINA_EXTRA: number | null = null;
export const VALOR_COPIA_EXTRA: number | null = null;
export const FORMATO_LIVRO = "21x21"; // em cm; confirmar com a gráfica
export const SANGRIA_MM = 3; // em cada lado

// ── Coleta ───────────────────────────────────────────────────────────────
export const MAX_GRAVACAO_MIN = 30; // por gravação
export const MAX_ARQUIVOS_LOTE = 30; // por upload em lote

// ── Pessoas ──────────────────────────────────────────────────────────────
export const MAX_COFACILITADORES = 3; // além do responsável

// ── Domínios ─────────────────────────────────────────────────────────────
export const DOMINIO_APP = "app.ecoa-memorias.com.br";
// O QR impresso aponta para cá. Nunca mudar: livros impressos dependem dele.
export const DOMINIO_QR = "ouvir.ecoa-memorias.com.br";

// ── E-mail ───────────────────────────────────────────────────────────────
// Domínio verificado no Resend. Ver docs/decisoes/dominio.md.
export const EMAIL_REMETENTE = "Ecoa Memórias <acesso@ecoa-memorias.com.br>";

// ── Lembretes e estimativas ──────────────────────────────────────────────
// Pergunta enviada há este número de dias sem resposta mostra "Lembrar com carinho".
export const LEMBRETE_APOS_DIAS = 3;
// Estimativa de páginas no 21x21 enquanto o livro não é paginado de verdade.
export const PALAVRAS_POR_PAGINA_ESTIMADA = 320;
export const PAGINAS_POR_FOTO_ESTIMADA = 0.5;

// ── Perguntas e configuração inicial ─────────────────────────────────────
export const PERGUNTAS_INICIAIS = 10; // marcadas no passo 2, por parentesco
export const ATUALIZAR_A_CADA_S = 4; // abas Causos e Enquete abertas na tela

// ── Fotos do acervo ──────────────────────────────────────────────────────
// Comprimidas no navegador: JPEG, lado maior até 3000 px (21 cm a 300 DPI pede 2480).
export const FOTO_LADO_MAX_PX = 3000;
export const FOTO_QUALIDADE_JPEG = 0.9;
export const MAX_FOTO_MB = 5; // igual ao limite do bucket acervo
export const MAX_FOTOS_POR_ENVIO = 30;
export const MAX_FOTOS_POR_LIVRO = 200; // espelhado em privado.max_fotos_por_livro()

// ── Família: causos e enquete ────────────────────────────────────────────
// Os que têm "espelhado" também são conferidos no banco; supabase/tests/config-banco.test.ts
// garante que os valores batem.
export const VOTOS_POR_PESSOA = 5; // espelhado em privado.votos_por_pessoa()
export const MAX_ITENS_ENQUETE = 30; // espelhado em privado.max_itens_enquete()
export const MAX_VOTANTES_POR_ENQUETE = 150; // espelhado
export const MAX_TROCAS_VOTO_POR_HORA = 300; // espelhado
export const MAX_CAUSOS_POR_HORA = 20; // espelhado, por livro
export const MAX_CAUSOS_POR_DIA = 40; // espelhado, por livro
export const MAX_CAUSO_AUDIO_MIN = 3;
export const MAX_CAUSO_AUDIO_MB = 2; // igual ao limite do bucket causos
export const CAUSO_AUDIO_KBPS = 48; // 3 min ≈ 1,1 MB
export const CONSENTIMENTO_CAUSO_VERSAO = 1; // mudou a frase? suba a versão
export const TEXTO_PERGUNTA_MAX = 500; // igual ao CHECK de prompts e poll_items
