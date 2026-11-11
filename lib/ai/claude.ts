// Cliente do Claude para o pipeline. Interface injetável: o lab e os testes usam um
// cliente simulado; a plataforma (prompt 6) usa este mesmo contrato com o streaming.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { Uso } from "./custo";

export type Etapa =
  "estruturar" | "editar" | "verificar" | "classificar" | "memoria";

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
  /**
   * Texto ao vivo: recebe o JSON acumulado até agora e o número da tentativa (uma nova
   * tentativa recomeça do zero). Chamado no máximo a cada `intervaloTextoMs`. Se devolver
   * uma promessa, ela é aguardada antes de `gerar` terminar.
   */
  aoTexto?: (acumulado: string, tentativa: number) => void | Promise<void>;
  intervaloTextoMs?: number;
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

/** Falha depois de esgotar as tentativas. `uso` soma o que já foi gasto (e cobrado). */
export class ErroIA extends Error {
  constructor(
    mensagem: string,
    readonly uso: Uso = { entrada: 0, saida: 0, cacheLido: 0, cacheGravado: 0 },
    readonly codigo:
      "recusa" | "api" | "json_invalido" | "cortada" = "json_invalido",
  ) {
    super(mensagem);
    this.name = "ErroIA";
  }
}

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
    let ultimoCodigo: ErroIA["codigo"] = "json_invalido";
    const pendentes: Promise<void>[] = [];
    const esperarTexto = () => Promise.allSettled(pendentes.splice(0));
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      const inicio = Date.now();
      let msPrimeira: number | null = null;
      let acumulado = "";
      let ultimoTexto = 0;
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
        acumulado += delta;
        if (msPrimeira === null && detectar?.(acumulado)) {
          msPrimeira = Date.now() - inicio;
          c.aoPrimeiraPalavra?.();
        }
        const agora = Date.now();
        if (c.aoTexto && agora - ultimoTexto >= (c.intervaloTextoMs ?? 0)) {
          ultimoTexto = agora;
          const r = c.aoTexto(acumulado, tentativa);
          if (r) pendentes.push(r);
        }
      });

      let mensagem;
      try {
        mensagem = await stream.finalMessage();
      } catch (e) {
        await esperarTexto();
        if (e instanceof Anthropic.APIError) {
          // O SDK já tentou de novo nos erros temporários. A mensagem do provedor não traz o texto.
          throw new ErroIA(
            `${c.etapa}: API respondeu ${e.status ?? "?"}`,
            uso,
            "api",
          );
        }
        // JSON fora do schema: tenta mais uma vez. O uso desta tentativa não chega até aqui
        // (o SDK lança antes de devolver a mensagem), então o custo registrado fica por baixo.
        ultimoErro = e instanceof Error ? e.message : String(e);
        ultimoCodigo = "json_invalido";
        continue;
      }
      await esperarTexto();

      uso.entrada += mensagem.usage.input_tokens;
      uso.saida += mensagem.usage.output_tokens;
      uso.cacheLido += mensagem.usage.cache_read_input_tokens ?? 0;
      uso.cacheGravado += mensagem.usage.cache_creation_input_tokens ?? 0;

      if (mensagem.stop_reason === "refusal") {
        throw new ErroIA(
          `${c.etapa}: o modelo recusou a tarefa`,
          uso,
          "recusa",
        );
      }
      if (mensagem.stop_reason === "max_tokens") {
        ultimoErro = `resposta cortada em ${c.maxTokens} tokens`;
        ultimoCodigo = "cortada";
        continue;
      }
      const dados = mensagem.parsed_output as T | null | undefined;
      if (dados == null) {
        ultimoErro = "resposta sem JSON";
        ultimoCodigo = "json_invalido";
        continue;
      }
      const invalido = c.validar?.(dados) ?? null;
      if (invalido) {
        ultimoErro = invalido;
        ultimoCodigo = "json_invalido";
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
    throw new ErroIA(
      `${c.etapa}: falhou 2 vezes (${ultimoErro})`,
      uso,
      ultimoCodigo,
    );
  }
}
