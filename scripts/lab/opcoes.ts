import { parseArgs } from "node:util";
import { PROVEDOR_PADRAO, TAMANHO_PADRAO, TAMANHOS_TEXTO } from "@/lib/config";
import type { Tamanho } from "@/lib/ai/etapas";

export type Opcoes = {
  provedor: string;
  tamanhos: Tamanho[];
  semCache: boolean;
  comparar: string | null;
  simulado: boolean;
  concorrencia: number;
  raiz: string;
};

export function lerOpcoes(
  argv: string[],
  env: NodeJS.ProcessEnv,
  raiz: string,
): Opcoes {
  const { values } = parseArgs({
    args: argv,
    options: {
      provedor: { type: "string" },
      tamanhos: { type: "string" },
      "sem-cache": { type: "boolean", default: false },
      comparar: { type: "string" },
      ajuda: { type: "boolean", default: false },
    },
  });
  if (values.ajuda) {
    console.log(AJUDA);
    process.exit(0);
  }
  const tamanhos: Tamanho[] =
    values.tamanhos === "todos"
      ? (Object.keys(TAMANHOS_TEXTO) as Tamanho[])
      : ((values.tamanhos?.split(",") ?? [TAMANHO_PADRAO]) as Tamanho[]);
  for (const t of tamanhos) {
    if (!(t in TAMANHOS_TEXTO))
      throw new Error(
        `Tamanho desconhecido: ${t}. Use resumido, medio, detalhado ou todos.`,
      );
  }
  return {
    provedor: values.provedor ?? env.LAB_PROVEDOR ?? PROVEDOR_PADRAO,
    tamanhos,
    semCache: values["sem-cache"] ?? false,
    comparar: values.comparar ?? null,
    simulado: env.LAB_FAKE === "1",
    concorrencia: Number(env.LAB_CONCORRENCIA ?? 4),
    raiz,
  };
}

export const AJUDA = `npm run lab                      processa lab/audios/ e gera lab/relatorio.md
npm run lab -- --tamanhos todos  gera resumido, médio e detalhado (padrão: médio)
npm run lab -- --provedor assemblyai
npm run lab -- --sem-cache       transcreve de novo, mesmo com cache
npm run lab -- --comparar <id>   compara lab/saidas/<id>/ia.json com editado.md
LAB_FAKE=1 npm run lab           rodada simulada, sem chaves nem áudio real`;
