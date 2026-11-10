import type { Transcricao } from "../schemas";

export type OpcoesTranscricao = {
  chave: string;
  modelo: string;
  dicas: string[]; // nomes do glossário, como dica de vocabulário
  fetch?: typeof fetch;
  esperarMs?: number; // intervalo de consulta (AssemblyAI)
};

export type Transcritor = (
  audio: Uint8Array,
  nomeArquivo: string,
  opcoes: OpcoesTranscricao,
) => Promise<Omit<Transcricao, "minutos" | "ms">>;

export async function exigirOk(
  resposta: Response,
  provedor: string,
): Promise<unknown> {
  const corpo = await resposta.text();
  if (!resposta.ok) {
    throw new Error(
      `${provedor} respondeu ${resposta.status}: ${corpo.slice(0, 300)}`,
    );
  }
  try {
    return JSON.parse(corpo);
  } catch {
    throw new Error(
      `${provedor} devolveu algo que não é JSON: ${corpo.slice(0, 200)}`,
    );
  }
}
