// Co-facilitadores, compartilhar no grupo, lembrar e resumo semanal (prompt 11).
// Design: docs/designs/cofacilitadores-compartilhar.md.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ativarPlano, como, criarBanco } from "./banco";

const RAIZ = path.resolve(__dirname, "..");
const down = readFileSync(
  path.join(RAIZ, "reversao/20261121120000_cofacilitadores.down.sql"),
  "utf8",
);
const up = readFileSync(
  path.join(RAIZ, "migrations/20261121120000_cofacilitadores.sql"),
  "utf8",
);

let db: PGlite;
let ana: string; // responsável do livro A
let bia: string; // irmã da Ana, convidada
let caio: string; // e-mail diferente do convite
let beto: string; // responsável do livro B
let livroA: string;
let livroB: string;

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

async function sql<T = Record<string, unknown>>(q: string, p: unknown[] = []) {
  return (await db.query<T>(q, p)).rows;
}

type Resposta =
  | { linhas: Record<string, unknown>[]; erro?: undefined }
  | { erro: string; linhas?: undefined };

async function comoPapel(
  papel: "authenticated" | "service_role" | "anon",
  usuario: string | null,
  q: string,
  p: unknown[] = [],
): Promise<Resposta> {
  return como(db, papel, usuario ? { sub: usuario } : {}, async (tx) => {
    await tx.exec("savepoint s");
    try {
      const linhas = (await tx.query<Record<string, unknown>>(q, p)).rows;
      await tx.exec("release savepoint s");
      return { linhas };
    } catch (e) {
      await tx.exec("rollback to savepoint s");
      return { erro: (e as Error).message };
    }
  });
}
const membro = (u: string, q: string, p: unknown[] = []) =>
  comoPapel("authenticated", u, q, p);
const servico = (q: string, p: unknown[] = []) =>
  comoPapel("service_role", null, q, p);

async function usuario(email: string, confirmado = true) {
  const [{ id }] = await sql<{ id: string }>(
    `insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
     values (gen_random_uuid(), $1, $2, '{"full_name": "Pessoa"}') returning id`,
    [email, confirmado ? new Date().toISOString() : null],
  );
  return id;
}

async function convidar(livro: string, por: string, email: string) {
  const id = crypto.randomUUID();
  const r = await servico(
    `select public.servico_criar_convite($1, $2, $3, $4, $5, 1::smallint)`,
    [livro, por, id, email, hash(id)],
  );
  return { id, erro: r.erro };
}

async function historiaPronta(livro: string) {
  const [{ id }] = await sql<{ id: string }>(
    `insert into public.stories (book_id, estado, pronta_em, titulo, ano, revisada_em, texto)
     values ($1, 'pronta', now(), 'O trem', 1962, now(),
       '{"titulo": "O trem", "paragrafos": [{"id": "p1", "texto": "Eu peguei o trem em 1962.", "fontes": ["s1"]}]}')
     returning id`,
    [livro],
  );
  return id;
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await usuario("ana@exemplo.com");
  bia = await usuario("bia@exemplo.com");
  caio = await usuario("caio@exemplo.com");
  beto = await usuario("beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Jair");
  livroB = await ativarPlano(db, beto, "Rosa");
});
afterAll(async () => db?.close());

describe("convite preso ao e-mail", () => {
  it("só o responsável convida; a irmã aceita e vira co-facilitadora", async () => {
    expect((await convidar(livroA, beto, "bia@exemplo.com")).erro).toBe(
      "sem_permissao",
    );
    const c = await convidar(livroA, ana, "  BIA@exemplo.com ");
    expect(c.erro).toBeUndefined();

    const meus = await membro(bia, `select * from public.meus_convites()`);
    expect(meus.linhas).toHaveLength(1);
    expect(
      (await membro(caio, `select * from public.meus_convites()`)).linhas,
    ).toHaveLength(0);

    expect(
      (await membro(caio, `select public.aceitar_convite($1)`, [c.id])).erro,
    ).toBe("convite_invalido");
    const ok = await membro(bia, `select public.aceitar_convite($1) as l`, [
      c.id,
    ]);
    expect(ok.linhas?.[0]?.l).toBe(livroA);
    // Idempotente para quem aceitou.
    expect(
      (await membro(bia, `select public.aceitar_convite($1)`, [c.id])).erro,
    ).toBeUndefined();
    const [{ papel }] = await sql<{ papel: string }>(
      `select papel from public.book_members where book_id = $1 and user_id = $2`,
      [livroA, bia],
    );
    expect(papel).toBe("cofacilitador");
  });

  it("e-mail não confirmado não aceita", async () => {
    const dani = await usuario("dani@exemplo.com", false);
    const c = await convidar(livroA, ana, "dani@exemplo.com");
    expect(
      (await membro(dani, `select public.aceitar_convite($1)`, [c.id])).erro,
    ).toBe("sem_permissao");
    await membro(ana, `select public.cancelar_convite($1)`, [c.id]);
  });

  it("co-facilitadora não convida, não cancela, não remove e não lê convites", async () => {
    expect((await convidar(livroA, bia, "eva@exemplo.com")).erro).toBe(
      "sem_permissao",
    );
    const c = await convidar(livroA, ana, "eva@exemplo.com");
    expect(
      (await membro(bia, `select public.cancelar_convite($1)`, [c.id])).erro,
    ).toBe("sem_permissao");
    expect(
      (await membro(bia, `select id from public.book_invites`)).linhas,
    ).toHaveLength(0);
    expect(
      (await membro(ana, `select id from public.book_invites`)).linhas!.length,
    ).toBeGreaterThan(0);
    expect(
      (await membro(bia, `select public.remover_membro($1, $2)`, [livroA, ana]))
        .erro,
    ).toBe("sem_permissao");
    // Nem direto na tabela.
    expect(
      (
        await membro(
          bia,
          `insert into public.book_members (book_id, user_id, papel) values ($1, $2, 'cofacilitador')`,
          [livroA, caio],
        )
      ).erro,
    ).toMatch(/permission denied/);
    await membro(ana, `select public.cancelar_convite($1)`, [c.id]);
  });

  it("co-facilitadora não consente a IA nem desliga QR (só do responsável)", async () => {
    expect(
      (
        await membro(
          bia,
          `select public.consentir_processamento_ia($1, 1::smallint)`,
          [livroA],
        )
      ).erro,
    ).toBe("sem_permissao");
  });

  it("teto de 3 conta os convites pendentes", async () => {
    const a = await convidar(livroA, ana, "f1@exemplo.com");
    const b = await convidar(livroA, ana, "f2@exemplo.com");
    expect(a.erro ?? b.erro).toBeUndefined(); // Bia + 2 pendentes = 3
    expect((await convidar(livroA, ana, "f3@exemplo.com")).erro).toBe(
      "limite_cofacilitadores",
    );
    // Reconvidar o mesmo e-mail troca o convite, não soma.
    expect(
      (await convidar(livroA, ana, "f2@exemplo.com")).erro,
    ).toBeUndefined();
    await membro(ana, `select public.cancelar_convite($1)`, [a.id]);
    expect(
      (await convidar(livroA, ana, "f3@exemplo.com")).erro,
    ).toBeUndefined();
  });

  it("não convida quem já é membro", async () => {
    expect((await convidar(livroA, ana, "bia@exemplo.com")).erro).toBe(
      "ja_membro",
    );
  });
});

describe("co-facilitadora faz o resto", () => {
  it("lê o livro, os membros e edita perguntas como membro", async () => {
    const m = await membro(
      bia,
      `select email, papel from public.membros_do_livro($1)`,
      [livroA],
    );
    expect(m.linhas!.map((x) => x.papel)).toEqual([
      "responsavel",
      "cofacilitador",
    ]);
    expect(
      (await membro(bia, `select * from public.membros_do_livro($1)`, [livroB]))
        .linhas,
    ).toHaveLength(0);
  });

  it("sai do livro; o responsável remove e não pode ser removido", async () => {
    const gil = await usuario("gil@exemplo.com");
    const c = await convidar(livroB, beto, "gil@exemplo.com");
    await membro(gil, `select public.aceitar_convite($1)`, [c.id]);
    const sai = await membro(gil, `select public.sair_do_livro($1) as ok`, [
      livroB,
    ]);
    expect(sai.linhas?.[0]?.ok).toBe(true);
    expect(
      (
        await membro(beto, `select public.remover_membro($1, $2) as ok`, [
          livroB,
          beto,
        ])
      ).linhas?.[0]?.ok,
    ).toBe(false);
  });
});

describe("compartilhar no grupo", () => {
  it("cria um link por história pronta, lê sem fontes e revoga", async () => {
    const h = await historiaPronta(livroA);
    const id = crypto.randomUUID();
    const r = await servico(
      `select * from public.servico_compartilhar_historia($1, $2, $3, $4, 1::smallint)`,
      [h, bia, id, hash(id)],
    );
    expect(r.linhas?.[0]?.id).toBe(id);
    // Segundo pedido devolve o mesmo link.
    const outro = crypto.randomUUID();
    const r2 = await servico(
      `select * from public.servico_compartilhar_historia($1, $2, $3, $4, 1::smallint)`,
      [h, ana, outro, hash(outro)],
    );
    expect(r2.linhas?.[0]?.id).toBe(id);
    // Beto (outro livro) não compartilha.
    expect(
      (
        await servico(
          `select * from public.servico_compartilhar_historia($1, $2, $3, $4, 1::smallint)`,
          [h, beto, outro, hash(outro)],
        )
      ).erro,
    ).toBe("sem_permissao");

    const lida = await servico(
      `select public.servico_ler_compartilhada($1) as r`,
      [hash(id)],
    );
    const v = lida.linhas?.[0]?.r as Record<string, unknown>;
    expect(v.estado).toBe("ok");
    expect(v.paragrafos).toEqual(["Eu peguei o trem em 1962."]);
    expect(JSON.stringify(v)).not.toContain("s1");

    // anon não tem porta.
    expect(
      (
        await comoPapel(
          "anon",
          null,
          `select public.servico_ler_compartilhada($1)`,
          [hash(id)],
        )
      ).erro,
    ).toMatch(/permission denied/);

    expect(
      (await membro(beto, `select public.revogar_compartilhamento($1)`, [h]))
        .erro,
    ).toBe("sem_permissao");
    await membro(bia, `select public.revogar_compartilhamento($1)`, [h]);
    const depois = await servico(
      `select public.servico_ler_compartilhada($1) as r`,
      [hash(id)],
    );
    expect(depois.linhas?.[0]?.r).toBeNull();
  });
});

describe("lembrar e resumo", () => {
  it("lembrar marca só pergunta enviada; resumo devolve só números", async () => {
    const [{ id }] = await sql<{ id: string }>(
      `insert into public.prompts (book_id, texto, origem, estado) values ($1, 'Como era a escola?', 'propria', 'para_enviar') returning id`,
      [livroA],
    );
    expect(
      (await membro(bia, `select public.lembrar_pergunta($1) as ok`, [id]))
        .linhas?.[0]?.ok,
    ).toBe(false);
    await sql(`update public.prompts set estado = 'enviada' where id = $1`, [
      id,
    ]);
    expect(
      (await membro(bia, `select public.lembrar_pergunta($1) as ok`, [id]))
        .linhas?.[0]?.ok,
    ).toBe(true);
    expect(
      (await membro(beto, `select public.lembrar_pergunta($1)`, [id])).erro,
    ).toBe("sem_permissao");

    const r = await servico(`select * from public.servico_resumo_semanal($1)`, [
      livroA,
    ]);
    expect(r.linhas?.[0]).toEqual({
      historias_novas: 1,
      perguntas_esperando: 1,
      paginas_estimadas: 1,
    });
    await membro(bia, `select public.definir_resumo_semanal($1, false)`, [
      livroA,
    ]);
    const l = await servico(
      `select * from public.servico_livros_para_resumo()`,
    );
    expect(l.linhas!.length).toBeGreaterThan(0);
  });
});

describe("reversão", () => {
  it("desce e sobe de novo", async () => {
    const copia = await criarBanco();
    await copia.exec(down);
    await copia.exec(up);
    await copia.close();
  });
});
