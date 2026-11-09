// Regras do passe dentro do banco: ativar, renovar, trocar responsável e o job diário.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ativarPasse, criarBanco, criarUsuario } from "./banco";

let db: PGlite;
let ana: string;

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
});

afterAll(async () => {
  await db.close();
});

async function livro(id: string) {
  const r = await db.query<{
    passe_estado: string;
    vence_em_dias: number;
  }>(
    `select passe_estado, round(extract(epoch from passe_vence_em - now()) / 86400)::int as vence_em_dias
     from public.books where id = $1`,
    [id],
  );
  return r.rows[0];
}

const DIAS_12_MESES = [365, 366];

describe("admin_ativar_passe", () => {
  it("cria livro ativo por 12 meses com 1 responsável", async () => {
    const id = await ativarPasse(db, ana, "Jair");
    const l = await livro(id);
    expect(l.passe_estado).toBe("ativo");
    expect(DIAS_12_MESES).toContain(l.vence_em_dias);
    const membros = await db.query(
      `select user_id, papel from public.book_members where book_id = $1`,
      [id],
    );
    expect(membros.rows).toEqual([{ user_id: ana, papel: "responsavel" }]);
  });

  it("aceita autor sem nome", async () => {
    const id = await ativarPasse(db, ana, "  ");
    const r = await db.query<{ autor_nome: string | null }>(
      `select autor_nome from public.books where id = $1`,
      [id],
    );
    expect(r.rows[0].autor_nome).toBeNull();
  });

  it.each([0, 37])("recusa %i meses", async (meses) => {
    await expect(ativarPasse(db, ana, "Jair", meses)).rejects.toThrow(
      /meses fora do intervalo/,
    );
  });
});

describe("admin_renovar_passe", () => {
  it("passe vencido volta a ativo por 12 meses a partir de hoje", async () => {
    const id = await ativarPasse(db, ana, "Jair");
    await db.query(
      `update public.books set passe_estado = 'somente_leitura', passe_ativado_em = now() - interval '13 months',
       passe_vence_em = now() - interval '1 month' where id = $1`,
      [id],
    );
    await db.query(`select public.admin_renovar_passe($1, 12)`, [id]);
    const l = await livro(id);
    expect(l.passe_estado).toBe("ativo");
    expect(DIAS_12_MESES).toContain(l.vence_em_dias);
  });

  it("renovar cedo soma ao vencimento atual", async () => {
    const id = await ativarPasse(db, ana, "Jair");
    await db.query(
      `update public.books set passe_vence_em = now() + interval '3 months' where id = $1`,
      [id],
    );
    await db.query(`select public.admin_renovar_passe($1, 12)`, [id]);
    const l = await livro(id);
    expect(l.vence_em_dias).toBeGreaterThanOrEqual(455);
    expect(l.vence_em_dias).toBeLessThanOrEqual(458);
  });

  it("recusa livro inexistente", async () => {
    await expect(
      db.query(
        `select public.admin_renovar_passe('00000000-0000-0000-0000-000000000000', 12)`,
      ),
    ).rejects.toThrow(/livro não encontrado/);
  });
});

describe("admin_trocar_responsavel", () => {
  it("troca o responsável do livro", async () => {
    const id = await ativarPasse(db, ana, "Jair");
    const novo = await criarUsuario(db, "ana.certa@exemplo.com");
    await db.query(`select public.admin_trocar_responsavel($1, $2)`, [
      id,
      novo,
    ]);
    const membros = await db.query(
      `select user_id, papel from public.book_members where book_id = $1`,
      [id],
    );
    expect(membros.rows).toEqual([{ user_id: novo, papel: "responsavel" }]);
  });
});

describe("privado.vencer_passes (job diário)", () => {
  it("muda só os vencidos e grava um evento por livro", async () => {
    const banco = await criarBanco();
    const dono = await criarUsuario(banco, "dono@exemplo.com");
    const emDia = await ativarPasse(banco, dono, "Em dia");
    const vencido = await ativarPasse(banco, dono, "Vencido");
    await banco.query(
      `update public.books set passe_ativado_em = now() - interval '13 months', passe_vence_em = now() - interval '1 hour' where id = $1`,
      [vencido],
    );

    const r = await banco.query<{ total: number }>(
      `select privado.vencer_passes() as total`,
    );
    expect(r.rows[0].total).toBe(1);

    const estados = await banco.query<{ id: string; passe_estado: string }>(
      `select id, passe_estado from public.books`,
    );
    const porId = Object.fromEntries(
      estados.rows.map((l) => [l.id, l.passe_estado]),
    );
    expect(porId[emDia]).toBe("ativo");
    expect(porId[vencido]).toBe("somente_leitura");

    const eventos = await banco.query(
      `select book_id, ator_tipo, acao from public.events`,
    );
    expect(eventos.rows).toEqual([
      { book_id: vencido, ator_tipo: "sistema", acao: "passe_vencido" },
    ]);

    const deNovo = await banco.query<{ total: number }>(
      `select privado.vencer_passes() as total`,
    );
    expect(deNovo.rows[0].total).toBe(0);
    await banco.close();
  });
});
