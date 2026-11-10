// Tokens e minutos → reais, e projeção do custo de IA por livro.
import {
  COTACAO_USD_BRL,
  FATOR_ESCRITA_CACHE,
  PRECOS_MODELOS_USD_MTOK,
  PRECOS_TRANSCRICAO_USD_MIN,
  PREMISSA_HISTORIAS_POR_LIVRO,
  PREMISSA_MIN_AUDIO_POR_HISTORIA,
  PREMISSA_TROCAS_TAMANHO_POR_HISTORIA,
} from "@/lib/config";

export type Uso = {
  entrada: number;
  saida: number;
  cacheLido: number;
  cacheGravado: number;
};

export function custoClaudeUSD(modelo: string, uso: Uso): number {
  const preco = PRECOS_MODELOS_USD_MTOK[modelo];
  if (!preco)
    throw new Error(`Sem preço para o modelo ${modelo} em lib/config.ts`);
  return (
    (uso.entrada * preco.entrada +
      uso.cacheGravado * preco.entrada * FATOR_ESCRITA_CACHE +
      uso.cacheLido * preco.cacheLido +
      uso.saida * preco.saida) /
    1_000_000
  );
}

export function custoTranscricaoUSD(provedor: string, minutos: number): number {
  const preco = PRECOS_TRANSCRICAO_USD_MIN[provedor];
  if (preco === undefined)
    throw new Error(`Sem preço para o provedor ${provedor} em lib/config.ts`);
  return preco * minutos;
}

export function emReais(usd: number): number {
  return usd * COTACAO_USD_BRL;
}

export function formatarReais(brl: number): string {
  return `R$ ${brl.toFixed(2).replace(".", ",")}`;
}

/**
 * Projeção por livro a partir do custo medido por minuto de áudio em cada etapa.
 * Trocar o tamanho do texto refaz edição e verificação; transcrição e estruturação, não.
 */
export function projetarLivroUSD(porMinuto: {
  transcricao: number;
  estruturar: number;
  editar: number;
  verificar: number;
}): number {
  const minutosLivro =
    PREMISSA_HISTORIAS_POR_LIVRO * PREMISSA_MIN_AUDIO_POR_HISTORIA;
  const geracoes = 1 + PREMISSA_TROCAS_TAMANHO_POR_HISTORIA;
  return (
    minutosLivro *
    (porMinuto.transcricao +
      porMinuto.estruturar +
      (porMinuto.editar + porMinuto.verificar) * geracoes)
  );
}
