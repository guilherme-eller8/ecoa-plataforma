// Banco de perguntas: supabase/seed/perguntas.json (rascunho em revisão humana).
// Validado ao importar: um JSON quebrado derruba o build, não a tela.
import { z } from "zod";
import { PERGUNTAS_INICIAIS } from "@/lib/config";
import type { Parentesco } from "@/lib/supabase/tipos";
import json from "@/supabase/seed/perguntas.json";

const PARENTESCOS = [
  "pai",
  "mae",
  "avo",
  "avoa",
  "tio",
  "tia",
  "outro",
] as const;
const idPergunta = z.string().regex(/^[a-z]+-[0-9]{2,3}$/);

const esquema = z
  .object({
    status: z.enum(["rascunho", "revisado"]),
    revisado_por: z.string().nullable(),
    nota: z.string().optional(),
    temas: z.array(
      z.object({ id: z.string().regex(/^[a-z]+$/), nome: z.string().min(1) }),
    ),
    perguntas: z.array(
      z.object({
        id: idPergunta,
        tema: z.string(),
        texto: z.string().min(10).max(300),
        fe: z.boolean(),
      }),
    ),
    iniciais: z.record(
      z.enum(PARENTESCOS),
      z.array(idPergunta).length(PERGUNTAS_INICIAIS),
    ),
  })
  .superRefine((b, ctx) => {
    const temas = new Set(b.temas.map((t) => t.id));
    const ids = new Map(b.perguntas.map((p) => [p.id, p]));
    if (ids.size !== b.perguntas.length)
      ctx.addIssue({ code: "custom", message: "id de pergunta repetido" });
    for (const p of b.perguntas)
      if (!temas.has(p.tema))
        ctx.addIssue({ code: "custom", message: `tema desconhecido: ${p.id}` });
    for (const [parentesco, lista] of Object.entries(b.iniciais))
      for (const id of lista) {
        const p = ids.get(id);
        if (!p)
          ctx.addIssue({
            code: "custom",
            message: `${parentesco}: ${id} não existe`,
          });
        else if (p.fe)
          ctx.addIssue({
            code: "custom",
            message: `${parentesco}: ${id} é de fé`,
          });
      }
  });

const banco = esquema.parse(json);

export type Tema = (typeof banco.temas)[number];
export type PerguntaDoBanco = (typeof banco.perguntas)[number];

export const STATUS_DO_BANCO = banco.status;
export const TEMAS: readonly Tema[] = banco.temas;
export const PERGUNTAS: readonly PerguntaDoBanco[] = banco.perguntas;

const porId = new Map(PERGUNTAS.map((p) => [p.id, p]));

export function perguntaPorId(id: string): PerguntaDoBanco | undefined {
  return porId.get(id);
}

/** Perguntas de um tema. Sem `fe`, devolve todas; com `fe: false`, tira as de fé. */
export function perguntasDoTema(
  tema: string,
  filtro: { fe?: boolean } = {},
): PerguntaDoBanco[] {
  return PERGUNTAS.filter(
    (p) => p.tema === tema && (filtro.fe === undefined || p.fe === filtro.fe),
  );
}

/** As 10 iniciais do parentesco; sem parentesco, as de "outro". */
export function iniciaisDo(
  parentesco: Parentesco | null | undefined,
): PerguntaDoBanco[] {
  return banco.iniciais[parentesco ?? "outro"].map((id) => porId.get(id)!);
}
