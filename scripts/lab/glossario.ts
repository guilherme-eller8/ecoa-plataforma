import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Glossario } from "@/lib/ai/schemas";

export class ErroUsuario extends Error {}

export function carregarGlossario(
  dirLab: string,
  simulado: boolean,
): Glossario {
  const real = join(dirLab, "glossario.json");
  const exemplo = join(dirLab, "glossario.exemplo.json");
  const arquivo = existsSync(real) ? real : simulado ? exemplo : null;
  if (!arquivo) {
    throw new ErroUsuario(
      `Falta ${real}. Copie lab/glossario.exemplo.json para lab/glossario.json e preencha com o autor, as pessoas, os lugares e o consentimento.`,
    );
  }
  const g = Glossario.safeParse(JSON.parse(readFileSync(arquivo, "utf8")));
  if (!g.success)
    throw new ErroUsuario(
      `${arquivo} inválido: ${g.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  if (!simulado && !g.data.consentimento) {
    throw new ErroUsuario(
      `${arquivo} não tem "consentimento". O lab não processa voz real sem o consentimento registrado (quem, data, escopo). Ver lab/README.md.`,
    );
  }
  return g.data;
}
