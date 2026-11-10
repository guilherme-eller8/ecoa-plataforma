// Fonte única de configuração da plataforma. Preço, limites, formato do livro e domínios saem daqui.
// Mudou um número de negócio? Muda só aqui.

export const MARCA = "Ecoa Memórias";

// ── Passe ────────────────────────────────────────────────────────────────
// R$ 467 por ano: gravações ilimitadas e 1 livro de 80 páginas.
export const PRECO_PASSE = 467; // exibir como "R$ 467"
export const DURACAO_PASSE_MESES = 12; // conta a partir da ativação

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
export const DOMINIO_APP = "app.ecoamemorias.com.br";
// O QR impresso aponta para cá. Nunca mudar: livros impressos dependem dele.
export const DOMINIO_QR = "ouvir.ecoamemorias.com.br";

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
