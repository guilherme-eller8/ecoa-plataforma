// Uma página do servidor só pode importar componentes de um módulo "use client". Qualquer
// outro valor (constante, função) chega como referência de cliente e quebra em produção:
// foi o que derrubou /livro/[id]/perguntas (ABAS.includes is not a function).
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "..");

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

const ehCliente = (codigo: string) => /^\s*["']use client["']/.test(codigo);

function resolver(origem: string): string | null {
  if (!origem.startsWith("@/")) return null;
  const base = path.join(RAIZ, origem.slice(2));
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    try {
      if (statSync(base + ext).isFile()) return base + ext;
    } catch {}
  }
  return null;
}

describe("páginas do servidor e módulos de cliente", () => {
  const paginas = arquivos(path.join(RAIZ, "app")).filter((f) =>
    /(page|layout)\.tsx$/.test(f),
  );

  it.each(paginas.map((f) => [path.relative(RAIZ, f), f]))(
    "%s só importa componentes de módulos 'use client'",
    (_nome, arquivo) => {
      const codigo = readFileSync(arquivo, "utf8");
      if (ehCliente(codigo)) return;
      const problemas: string[] = [];
      for (const m of codigo.matchAll(
        /import\s+(?!type\b)\{([^}]+)\}\s+from\s+["']([^"']+)["']/g,
      )) {
        const alvo = resolver(m[2]);
        if (!alvo || !ehCliente(readFileSync(alvo, "utf8"))) continue;
        for (const nome of m[1].split(",").map((n) => n.trim())) {
          if (!nome || nome.startsWith("type ")) continue;
          const local = nome.split(/\s+as\s+/)[0];
          // componente = PascalCase (TelaPerguntas); CONSTANTE e camelCase ficam de fora
          if (!/^[A-Z][a-z]/.test(local)) problemas.push(`${local} de ${m[2]}`);
        }
      }
      expect(problemas).toEqual([]);
    },
  );
});
