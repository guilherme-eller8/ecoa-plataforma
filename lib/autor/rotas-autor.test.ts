// O token do autor nunca alcança as tabelas da família (M7, T5). As rotas do autor usam a chave
// secreta para algumas tabelas (recordings, author_access, storage), e a RLS não segura a chave
// secreta: este teste lê o código e reprova qualquer tabela da família citada ali.
// Limite: não pega um nome de tabela montado em variável. As duas camadas do banco (sem grant
// e política restritiva) continuam sendo a defesa principal.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TABELAS_DA_FAMILIA } from "@/lib/familia/tabelas";

const RAIZ = path.resolve(__dirname, "../..");

function arquivos(pasta: string): string[] {
  const abs = path.join(RAIZ, pasta);
  return readdirSync(abs).flatMap((n) => {
    const p = path.join(abs, n);
    if (statSync(p).isDirectory()) return arquivos(path.join(pasta, n));
    return /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n)
      ? [path.join(pasta, n)]
      : [];
  });
}

/** Os arquivos do autor e os de lib/ que eles importam, um nível abaixo. */
function codigoDoAutor() {
  const base = [...arquivos("app/a"), ...arquivos("lib/autor")];
  const importados = new Set<string>();
  for (const f of base) {
    for (const m of readFileSync(path.join(RAIZ, f), "utf8").matchAll(
      /from\s+["']@\/(lib\/[^"']+)["']/g,
    )) {
      for (const ext of [".ts", ".tsx", "/index.ts"]) {
        try {
          statSync(path.join(RAIZ, m[1] + ext));
          importados.add(m[1] + ext);
          break;
        } catch {
          // não é esse
        }
      }
    }
  }
  return [...new Set([...base, ...importados])];
}

function nomesUsados(fonte: string) {
  return [...fonte.matchAll(/\.(?:from|rpc)\(\s*["'`]([a-z_]+)["'`]/g)].map(
    (m) => m[1],
  );
}

describe("rotas do autor x tabelas da família", () => {
  const lidos = codigoDoAutor();

  it("lê as rotas e os módulos que elas importam", () => {
    expect(lidos.some((f) => f.startsWith("app/a/"))).toBe(true);
    expect(lidos).toContain("lib/autor/pagina.ts");
  });

  it.each(lidos)("%s não cita nenhuma tabela da família", (f) => {
    const fonte = readFileSync(path.join(RAIZ, f), "utf8");
    const proibidas = nomesUsados(fonte).filter((n) =>
      (TABELAS_DA_FAMILIA as readonly string[]).includes(n),
    );
    expect(proibidas).toEqual([]);
  });

  it("o detector pega um .from() de family_messages", () => {
    expect(
      nomesUsados(`await admin.from("family_messages").select("*")`),
    ).toEqual(["family_messages"]);
  });
});
