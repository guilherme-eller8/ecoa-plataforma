// Monta um prompt a partir dos arquivos .md de lib/ai/prompts.
// {{> _regras}} inclui outro arquivo; {{nome}} recebe um valor.
// O diretório-base é um argumento para funcionar no lab, no Vercel e no Trigger.dev.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export type LeitorPrompt = (nome: string) => string;

export function leitorDeDiretorio(diretorio: string): LeitorPrompt {
  return (nome) => readFileSync(join(diretorio, `${nome}.md`), "utf8");
}

export function montarPrompt(
  ler: LeitorPrompt,
  nome: string,
  valores: Record<string, string> = {},
  usados: Set<string> = new Set(),
): string {
  if (usados.has(nome)) throw new Error(`Inclusão circular no prompt: ${nome}`);
  usados.add(nome);
  const texto = ler(nome)
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, incluido: string) =>
      montarPrompt(ler, incluido, valores, new Set(usados)).trim(),
    )
    .replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, chave: string) => {
      if (!(chave in valores))
        throw new Error(`Prompt "${nome}": falta o valor {{${chave}}}`);
      return valores[chave];
    });
  return texto.trim();
}

/** Hash curto do texto bruto de cada prompt, para saber qual versão gerou cada saída. */
export function hashPrompts(
  ler: LeitorPrompt,
  nomes: string[],
): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const nome of nomes) {
    hashes[nome] = createHash("sha256")
      .update(ler(nome))
      .digest("hex")
      .slice(0, 10);
  }
  return hashes;
}
