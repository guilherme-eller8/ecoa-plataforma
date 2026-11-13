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
export const MAX_GRAVACAO_MIN = 30; // por gravação (espelhado em privado.max_gravacao_s); a conversa segue em partes (P39)
export const GRAVACAO_KBPS = 48; // voz em Opus/AAC; 30 min ≈ 11 MB
export const MAX_GRAVACOES_AUTOR_DIA = 30; // espelhado, por livro, pelo link do autor (T29)
export const MAX_MB_AUTOR_DIA = 300; // espelhado, por livro, pelo link do autor (T29)
export const MAX_ENVIOS_ABERTOS_AUTOR = 5; // espelhado no SQL de autor_preparar_gravacao
export const CONSENTIMENTO_AUTOR_VERSAO = 2; // mudou a frase? suba a versão (v2 cita a IA, P41)
export const MAX_ARQUIVOS_LOTE = 30; // por upload em lote

// ── Áudios recebidos (prompt 5A) ─────────────────────────────────────────
// 50 MB é o teto por arquivo do plano grátis do Supabase (o PRD pede 100; muda com o Pro).
// Espelhado em privado.max_audio_bytes() e no limite do bucket "audios".
export const MAX_AUDIO_MB = 50;
export const FORMATOS_AUDIO = [
  "opus",
  "ogg",
  "m4a",
  "mp3",
  "wav",
  "webm",
] as const;
export const SUBIDAS_SIMULTANEAS = 2; // arquivos subindo ao mesmo tempo

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
export const PERGUNTAS_INICIAIS = 8; // marcadas no passo 2: 1 por fase da vida, por parentesco
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
// Enquete por fase (P35): até 2 por fase; teto total = 2 × 9 categorias (8 fases + outras).
export const VOTOS_POR_FASE = 2; // espelhado em privado.votos_por_fase()
export const VOTOS_POR_PESSOA = 18; // espelhado em privado.votos_por_pessoa()
// A lista inteira do banco (150) mais as próprias e as sugestões da família.
export const MAX_ITENS_ENQUETE = 200; // espelhado em privado.max_itens_enquete()
export const MAX_VOTANTES_POR_ENQUETE = 150; // espelhado
export const MAX_TROCAS_VOTO_POR_HORA = 300; // espelhado
export const MAX_CAUSOS_POR_HORA = 20; // espelhado, por livro
export const MAX_CAUSOS_POR_DIA = 40; // espelhado, por livro
export const MAX_CAUSO_AUDIO_MIN = 3;
export const MAX_CAUSO_AUDIO_MB = 2; // igual ao limite do bucket causos
export const CONSENTIMENTO_CAUSO_VERSAO = 1; // mudou a frase? suba a versão
export const TEXTO_PERGUNTA_MAX = 500; // igual ao CHECK de prompts e poll_items

// ── IA (laboratório e pipeline) ──────────────────────────────────────────
// Ver docs/designs/laboratorio-ia.md. Preços em US$; conferir antes de decidir.

export const MODELO_RAPIDO = "claude-haiku-5-5"; // estruturar, classificar edições
export const MODELO_CAPAZ = "claude-opus-5-5"; // editar e verificar
export const MODELO_ALTERNATIVO = "claude-sonnet-5-5"; // alavanca de custo, medir antes de usar

// Preço por milhão de tokens (US$). Escrita de cache custa 1,25× a entrada.
export const PRECOS_MODELOS_USD_MTOK: Record<
  string,
  { entrada: number; saida: number; cacheLido: number }
> = {
  "claude-haiku-5-5": { entrada: 0.1, saida: 0.5, cacheLido: 0.01 },
  "claude-sonnet-5-5": { entrada: 2, saida: 10, cacheLido: 0.1 },
  "claude-opus-5-5": { entrada: 4, saida: 20, cacheLido: 0.2 },
};
export const FATOR_ESCRITA_CACHE = 1.25;

// Transcrição: preço por minuto de áudio (US$). NÃO CONFIRMADO: estimativa de mercado,
// conferir no site de cada provedor e virar a flag abaixo para true.
export const PRECOS_TRANSCRICAO_USD_MIN: Record<string, number> = {
  elevenlabs: 0.0067, // ~US$ 0,40 por hora
  assemblyai: 0.0045, // ~US$ 0,27 por hora
};
export const PRECOS_TRANSCRICAO_CONFIRMADOS = false;
export const MODELOS_TRANSCRICAO: Record<string, string> = {
  elevenlabs: "scribe_v1",
  assemblyai: "universal",
};
export const PROVEDOR_PADRAO = "elevenlabs";

export const COTACAO_USD_BRL = 5.5; // premissa; atualizar quando decidir preço

// Tamanho do texto: fração das palavras com conteúdo da transcrição.
export const TAMANHOS_TEXTO = {
  resumido: 0.3,
  medio: 0.6,
  detalhado: 0.9,
} as const;
export const TAMANHO_PADRAO = "medio";

// Segmentação da transcrição.
export const PAUSA_SEGMENTO_S = 1.5;
export const MAX_PALAVRAS_SEGMENTO = 40;

// Metas do PRD.
export const META_PRIMEIRAS_PALAVRAS_S = 60;
export const META_CUSTO_LIVRO_BRL = 30;

// Premissas para projetar o custo de IA por livro (ajustar com o uso real).
export const PREMISSA_HISTORIAS_POR_LIVRO = 25;
export const PREMISSA_MIN_AUDIO_POR_HISTORIA = 6;
export const PREMISSA_TROCAS_TAMANHO_POR_HISTORIA = 2;

// ── Pipeline (prompt 6, docs/designs/pipeline-texto-ao-vivo.md) ───────────
// Os quatro primeiros são espelhados no banco (supabase/tests/config-banco.test.ts confere).
export const MAX_HISTORIA_MIN = 30; // gravação avulsa mais longa que isso espera a divisão (P40)
export const MAX_MINUTOS_IA_DIA = 240; // áudio processado por livro em 24 h (T38)
export const MAX_NOMES_GLOSSARIO = 300; // sugeridos + aceitos por livro
export const MAX_NOMES_POR_HISTORIA = 10; // sugestões da IA por história
export const CONSENTIMENTO_IA_VERSAO = 1; // confirmação do responsável (P41); mudou a frase? suba
export const ESPERA_EMAIL_MIN = 2; // e-mail só se ninguém viu a história pronta nesse tempo (P42)
export const INTERVALO_TEXTO_MS = 400; // texto ao vivo: no máximo 1 mensagem por intervalo
export const MAX_RESUMOS_CONTEXTO = 40; // histórias prontas no contexto do livro
export const TENTATIVAS_POR_PASSO = 3; // Inngest: 1 + 2 novas tentativas
export const VARREDURA_GRAVACAO_MIN = 5; // gravação recebida sem história há mais que isso: reenvia
export const VARREDURA_PARADA_MIN = 20;
// Previsão mostrada no cartão (sem ansiedade): base + segundos por segundo de áudio, por fase.
// Calibrar com ai_usage.ms quando houver histórias reais.
export const PREVISAO_OUVIR_BASE_S = 15; // transcrever + estruturar
export const PREVISAO_OUVIR_POR_S = 0.08;
export const PREVISAO_ESCREVER_BASE_S = 25; // editar + verificar
export const PREVISAO_ESCREVER_POR_S = 0.35; // história em andamento há mais que isso: falhou ("parada")
