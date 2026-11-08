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
