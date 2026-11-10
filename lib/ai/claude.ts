// Cliente do Claude para o pipeline. Interface injetável: o lab e os testes usam um
// cliente simulado; a plataforma (prompt 6) usa este mesmo contrato com o streaming.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { Uso } from "./custo";

export type Etapa = "estruturar" | "editar" | "verificar" | "classificar";

export type ChamadaIA<T> = {
  etapa: Etapa;
  modelo: string;
  maxTokens: number;
  esforco?: "low" | "medium" | "high";
  sistemaFixo: string; // regras, estilo: igual em toda chamada da etapa (cache)
  sistemaLivro?: string; // contexto do livro: igual em toda chamada do livro (cache)
  usuario: string;
  schema: z.ZodType<T>;
  /** Regra extra além do zod (ex.: fontes existem). Devolve a mensagem de erro ou null. */
  validar?: (dados: T) => string | null;
  /** Campo JSON cujo 1º caractere marca a "primeira palavra" na tela (ex.: "texto"). */
  campoPrimeiraPalavra?: string;
  aoPrimeiraPalavra?: () => void;
};

export type RespostaIA<T> = {
  dados: T;
  uso: Uso;
  ms: number;
  msPrimeiraPalavra: number | null;
  idRequisicao: string | null;
  tentativas: number;
};

export interface ClienteIA {
  gerar<T>(chamada: ChamadaIA<T>): Promise<RespostaIA<T>>;
}

export class ErroIA extends Error {}

/** Detecta o 1º caractere do primeiro valor de `"campo": "..."` num JSON parcial. */
export function detectorPrimeiraPalavra(
  campo: string,
): (acumulado: string) => boolean {
  const padrao = new RegExp(`"${campo}"\\s*:\\s*"\\s*[^"\\s\\\\]`);
  return (acumulado) => padrao.test(acumulado);
}

export class ClienteAnthropic implements ClienteIA {
  private client: Anthropic;

  constructor(client?: Anthropic) {
    this.client = client ?? new Anthropic();
  }

  async gerar<T>(c: ChamadaIA<T>): Promise<RespostaIA<T>> {
    const uso: Uso = { entrada: 0, saida: 0, cacheLido: 0, cacheGravado: 0 };
    let ultimoErro = "";
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      const inicio = Date.now();
      let msPrimeira: number | null = null;
      let acumulado = "";
      const detectar = c.campoPrimeiraPalavra
        ? detectorPrimeiraPalavra(c.campoPrimeiraPalavra)
        : null;

      const system: Anthropic.TextBlockParam[] = [
        {
          type: "text",
          text: c.sistemaFixo,
          cache_control: { type: "ephemeral" },
        },
      ];
      if (c.sistemaLivro) {
        system.push({
          type: "text",
          text: c.sistemaLivro,
          cache_control: { type: "ephemeral" },
        });
      }

      const stream = this.client.messages.stream({
        model: c.modelo,
        max_tokens: c.maxTokens,
        system,
        messages: [{ role: "user", content: c.usuario }],
        output_config: {
          effort: c.esforco ?? "medium",
          format: zodOutputFormat(c.schema),
        },
      });
      stream.on("text", (delta) => {
        if (msPrimeira !== null || !detectar) return;
        acumulado += delta;
        if (detectar(acumulado)) {
          msPrimeira = Date.now() - inicio;
          c.aoPrimeiraPalavra?.();
        }
      });

      let mensagem;
      try {
        mensagem = await stream.finalMessage();
      } catch (e) {
        if (e instanceof Anthropic.APIError) throw e; // o SDK já tentou de novo nos erros temporários
        ultimoErro = e instanceof Error ? e.message : String(e);
        continue; // JSON fora do schema: tenta mais uma vez
      }

      uso.entrada += mensagem.usage.input_tokens;
      uso.saida += mensagem.usage.output_tokens;
      uso.cacheLido += mensagem.usage.cache_read_input_tokens ?? 0;
      uso.cacheGravado += mensagem.usage.cache_creation_input_tokens ?? 0;

      if (mensagem.stop_reason === "refusal") {
        throw new ErroIA(`${c.etapa}: o modelo recusou a tarefa`);
      }
      if (mensagem.stop_reason === "max_tokens") {
        ultimoErro = `resposta cortada em ${c.maxTokens} tokens`;
        continue;
      }
      const dados = mensagem.parsed_output as T | null | undefined;
      if (dados == null) {
        ultimoErro = "resposta sem JSON";
        continue;
      }
      const invalido = c.validar?.(dados) ?? null;
      if (invalido) {
        ultimoErro = invalido;
        continue;
      }
      return {
        dados,
        uso,
        ms: Date.now() - inicio,
        msPrimeiraPalavra: msPrimeira,
        idRequisicao: stream.request_id ?? null,
        tentativas: tentativa,
      };
    }
    throw new ErroIA(`${c.etapa}: falhou 2 vezes (${ultimoErro})`);
  }
}
