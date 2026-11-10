// Garante que só lib/eventos.ts escreve em events (o job do banco grava em SQL, de propósito).
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "..");
const PASTAS = ["app", "lib", "components"];

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome)
      ? [caminho]
      : [];
  });
}

describe("porta única de eventos", () => {
  it("nenhum arquivo além de lib/eventos.ts acessa a tabela events", () => {
    const culpados = PASTAS.flatMap((p) => arquivos(path.join(RAIZ, p)))
      .filter((arquivo) =>
        /from\(\s*["'`]events["'`]\s*\)/.test(readFileSync(arquivo, "utf8")),
      )
      .map((arquivo) => path.relative(RAIZ, arquivo));
    expect(culpados).toEqual(["lib/eventos.ts"]);
  });
});
