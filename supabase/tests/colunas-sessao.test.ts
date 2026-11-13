// As consultas das telas com a sessão só pedem colunas que quem está logado pode ler.
// Uma coluna sem grant (ex.: stories.erro) fazia o banco recusar a lista inteira, e a tela
// mostrava "Nenhuma história ainda" (achado no teste do prompt 8).
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  deixadaForaDoLivro,
  TODAS_AS_COLUNAS_DA_SESSAO,
} from "@/lib/historias/colunas";
import { ativarPlano, como, criarBanco, criarUsuario, tenta } from "./banco";

let db: PGlite;
let ana: string;

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  const livro = await ativarPlano(db, ana, "Jair");
  await db.query(
    `insert into public.stories (book_id, estado, pronta_em, titulo) values ($1, 'pronta', now(), 'T')`,
    [livro],
  );
});
afterAll(async () => {
  await db.close();
});

describe("colunas de stories lidas com a sessão", () => {
  it.each(TODAS_AS_COLUNAS_DA_SESSAO)("select %s", async (colunas) => {
    await como(db, "authenticated", { sub: ana }, async (tx) => {
      expect(await tenta(tx, `select ${colunas} from public.stories`)).toEqual({
        linhas: 1,
        afetadas: 0,
      });
    });
  });
});

describe("deixada fora do livro (prompt 7)", () => {
  it("só o contêiner que falhou com a divisão final vazia", () => {
    expect(
      deixadaForaDoLivro({ estado: "falhou", divisao: { final: [] } }),
    ).toBe(true);
    expect(deixadaForaDoLivro({ estado: "falhou", divisao: null })).toBe(false);
    expect(
      deixadaForaDoLivro({
        estado: "falhou",
        divisao: { final: [{ titulo: "x" }] },
      }),
    ).toBe(false);
    expect(
      deixadaForaDoLivro({ estado: "pronta", divisao: { final: [] } }),
    ).toBe(false);
  });
});
