// Compra do plano pelo Mercado Pago (prompt 14, parte 1): payments e as funções compra_*.
// Design: docs/designs/compra-mercado-pago.md. Só a chave secreta (service_role) chama.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarBanco, criarUsuario } from "./banco";

let db: PGlite;

async function sql<T = Record<string, unknown>>(q: string, p: unknown[] = []) {
  return (await db.query<T>(q, p)).rows;
}

async function criar(email: string) {
  const [r] = await sql<{ id: string; mp_link: string | null }>(
    `select * from public.compra_criar($1)`,
    [email],
  );
  return r;
}

async function criarComLink(email: string) {
  const r = await criar(email);
  await sql(`select public.compra_guardar_preferencia($1, $2, $3)`, [
    r.id,
    `pref-${r.id}`,
    `https://mp.test/${r.id}`,
  ]);
  return r.id;
}

type Registro = {
  book_id: string | null;
  novo: boolean;
  alerta: string | null;
};

async function registrar(
  compra: string,
  mp: string,
  acao: string,
  responsavel: string | null,
  extra: { valor?: number; alerta?: string | null } = {},
) {
  const [r] = await sql<Registro>(
    `select * from public.compra_registrar($1, $2, $3, $4, 'credit_card', 3, $5, $6)`,
    [compra, mp, acao, extra.valor ?? 46700, responsavel, extra.alerta ?? null],
  );
  return r;
}

async function compra(id: string) {
  const [r] = await sql<{
    estado: string;
    book_id: string | null;
    mp_pagamento_id: string | null;
    alertas: string[];
    acesso_enviado_em: string | null;
  }>(`select * from public.payments where id = $1`, [id]);
  return r;
}

async function erro(q: string, p: unknown[] = []) {
  try {
    await db.query(q, p);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

beforeAll(async () => {
  db = await criarBanco();
});
afterAll(async () => {
  await db.close();
});

describe("compra_criar", () => {
  it("grava o valor do banco e reaproveita a compra aberta com link", async () => {
    const id = await criarComLink("reuso@exemplo.com");
    const [p] = await sql<{ valor_centavos: number; estado: string }>(
      `select valor_centavos, estado from public.payments where id = $1`,
      [id],
    );
    expect(p).toEqual({ valor_centavos: 46700, estado: "criado" });

    const de_novo = await criar("  Reuso@Exemplo.com ");
    expect(de_novo).toEqual({ id, mp_link: `https://mp.test/${id}` });
  });

  it("compra sem link ou velha não é reaproveitada", async () => {
    const semLink = await criar("velha@exemplo.com");
    const outra = await criar("velha@exemplo.com");
    expect(outra.id).not.toBe(semLink.id);

    const comLink = await criarComLink("velha2@exemplo.com");
    await sql(
      `update public.payments set criado_em = now() - interval '31 minutes' where id = $1`,
      [comLink],
    );
    expect((await criar("velha2@exemplo.com")).id).not.toBe(comLink);
  });

  it("teto por e-mail canônico: pontos e +algo do Gmail contam juntos", async () => {
    const variacoes = [
      "fulano@gmail.com",
      "f.ulano@gmail.com",
      "fulano+1@gmail.com",
      "ful.ano+x@googlemail.com",
      "FULANO@gmail.com",
    ];
    for (const e of variacoes) await criar(e); // sem link: nenhuma é reaproveitada
    expect(
      await erro(
        `select * from public.compra_criar('f.u.l.a.n.o+z@gmail.com')`,
      ),
    ).toBe("compra_teto_email");
    // Outro domínio não soma.
    expect((await criar("fulano@hotmail.com")).id).toBeTruthy();
  });

  it("guardar a preferência só vale uma vez", async () => {
    const id = await criarComLink("pref@exemplo.com");
    await sql(
      `select public.compra_guardar_preferencia($1, 'outra', 'outro')`,
      [id],
    );
    const [p] = await sql<{ mp_link: string }>(
      `select mp_link from public.payments where id = $1`,
      [id],
    );
    expect(p.mp_link).toBe(`https://mp.test/${id}`);
  });
});

describe("compra_registrar", () => {
  it("aprovar cria 1 livro com 1 responsável e 12 meses; repetir não cria outro", async () => {
    const usuario = await criarUsuario(db, "aprova@exemplo.com");
    const id = await criarComLink("aprova@exemplo.com");

    const r1 = await registrar(id, "mp-1", "aprovar", usuario);
    expect(r1.novo).toBe(true);
    expect(r1.alerta).toBeNull();
    expect(r1.book_id).toBeTruthy();

    const [livro] = await sql<{ meses: number; plano_estado: string }>(
      `select plano_estado,
              extract(year from age(plano_vence_em, plano_ativado_em)) * 12
                + extract(month from age(plano_vence_em, plano_ativado_em)) as meses
       from public.books where id = $1`,
      [r1.book_id],
    );
    expect(livro.plano_estado).toBe("ativo");
    expect(Number(livro.meses)).toBe(12);
    const membros = await sql(
      `select user_id, papel from public.book_members where book_id = $1`,
      [r1.book_id],
    );
    expect(membros).toEqual([{ user_id: usuario, papel: "responsavel" }]);

    const r2 = await registrar(id, "mp-1", "aprovar", usuario);
    expect(r2).toEqual({ book_id: r1.book_id, novo: false, alerta: null });
    const [{ n }] = await sql<{ n: number }>(
      `select count(*)::int as n from public.book_members where user_id = $1`,
      [usuario],
    );
    expect(n).toBe(1);
    expect((await compra(id)).estado).toBe("aprovado");
  });

  it("outro pagamento aprovado na mesma compra: pagamento_duplicado 1 vez só", async () => {
    const usuario = await criarUsuario(db, "duplo@exemplo.com");
    const id = await criarComLink("duplo@exemplo.com");
    const r1 = await registrar(id, "mp-d1", "aprovar", usuario);
    const r2 = await registrar(id, "mp-d2", "aprovar", usuario);
    expect(r2).toEqual({
      book_id: r1.book_id,
      novo: false,
      alerta: "pagamento_duplicado",
    });
    const r3 = await registrar(id, "mp-d2", "aprovar", usuario);
    expect(r3.alerta).toBeNull();
    expect((await compra(id)).mp_pagamento_id).toBe("mp-d1");
  });

  it("valor diferente: retido, nenhum livro, alerta 1 vez", async () => {
    const usuario = await criarUsuario(db, "valor@exemplo.com");
    const id = await criarComLink("valor@exemplo.com");
    const r1 = await registrar(id, "mp-v", "aprovar", usuario, { valor: 100 });
    expect(r1).toEqual({
      book_id: null,
      novo: false,
      alerta: "valor_diferente",
    });
    const r2 = await registrar(id, "mp-v", "aprovar", usuario, { valor: 100 });
    expect(r2.alerta).toBeNull();
    // Nem o valor certo depois tira do retido.
    const r3 = await registrar(id, "mp-v", "aprovar", usuario);
    expect(r3.book_id).toBeNull();
    expect(await compra(id)).toMatchObject({ estado: "retido", book_id: null });
  });

  it("recusado ou pendente depois de aprovado não muda nada", async () => {
    const usuario = await criarUsuario(db, "volta@exemplo.com");
    const id = await criarComLink("volta@exemplo.com");
    await registrar(id, "mp-r1", "recusado", null);
    expect((await compra(id)).estado).toBe("recusado");
    await registrar(id, "mp-r2", "pendente", null);
    expect((await compra(id)).estado).toBe("pendente");
    await registrar(id, "mp-r3", "aprovar", usuario);
    await registrar(id, "mp-r1", "recusado", null);
    await registrar(id, "mp-r2", "pendente", null);
    expect((await compra(id)).estado).toBe("aprovado");
  });

  it("estorno antes do aprovar: estornado, e o aprovar seguinte não cria livro", async () => {
    const usuario = await criarUsuario(db, "estorno@exemplo.com");
    const id = await criarComLink("estorno@exemplo.com");
    const r1 = await registrar(id, "mp-e", "estorno", null);
    expect(r1).toEqual({ book_id: null, novo: false, alerta: "estorno" });
    const r2 = await registrar(id, "mp-e", "aprovar", usuario);
    expect(r2).toEqual({ book_id: null, novo: false, alerta: null });
    expect(await compra(id)).toMatchObject({
      estado: "estornado",
      book_id: null,
    });
  });

  it("estorno depois de aprovado mantém o livro e avisa 1 vez", async () => {
    const usuario = await criarUsuario(db, "estorno2@exemplo.com");
    const id = await criarComLink("estorno2@exemplo.com");
    const { book_id } = await registrar(id, "mp-e2", "aprovar", usuario);
    expect((await registrar(id, "mp-e2", "estorno", null)).alerta).toBe(
      "estorno",
    );
    expect((await registrar(id, "mp-e2", "estorno", null)).alerta).toBeNull();
    expect(await compra(id)).toMatchObject({ estado: "estornado", book_id });
  });

  it("reter sem alerta é erro; com alerta, retido e 1 aviso por tipo", async () => {
    const id = await criarComLink("reter@exemplo.com");
    expect(
      await erro(
        `select * from public.compra_registrar($1, 'x', 'reter', 46700, null, null, null, null)`,
        [id],
      ),
    ).toBe("compra_acao_invalida");
    expect(
      (await registrar(id, "x", "reter", null, { alerta: "conta_recusada" }))
        .alerta,
    ).toBe("conta_recusada");
    expect(
      (await registrar(id, "x", "reter", null, { alerta: "conta_recusada" }))
        .alerta,
    ).toBeNull();
    expect(
      (await registrar(id, "x", "reter", null, { alerta: "mediacao" })).alerta,
    ).toBe("mediacao");
    expect(await compra(id)).toMatchObject({
      estado: "retido",
      alertas: ["conta_recusada", "mediacao"],
    });
  });

  it("ação desconhecida, compra inexistente e aprovar sem responsável são erro", async () => {
    const id = await criarComLink("erros@exemplo.com");
    expect(
      await erro(
        `select * from public.compra_registrar($1, 'x', 'sumir', 1, null, null, null, null)`,
        [id],
      ),
    ).toBe("compra_acao_invalida");
    expect(
      await erro(
        `select * from public.compra_registrar(gen_random_uuid(), 'x', 'aprovar', 46700, null, null, null, null)`,
      ),
    ).toBe("compra_inexistente");
    expect(
      await erro(
        `select * from public.compra_registrar($1, 'x', 'aprovar', 46700, null, null, null, null)`,
        [id],
      ),
    ).toBe("compra_sem_responsavel");
  });

  it("segunda compra aprovada do mesmo e-mail em 24 h: segunda_compra_24h", async () => {
    const usuario = await criarUsuario(db, "duas@exemplo.com");
    const a = await criarComLink("duas@exemplo.com");
    const r1 = await registrar(a, "mp-a", "aprovar", usuario);
    expect(r1.alerta).toBeNull();
    const b = await criarComLink("duas@exemplo.com");
    expect(b).not.toBe(a); // a primeira já não está aberta
    const r2 = await registrar(b, "mp-b", "aprovar", usuario);
    expect(r2.novo).toBe(true);
    expect(r2.book_id).not.toBe(r1.book_id);
    expect(r2.alerta).toBe("segunda_compra_24h");
  });
});

describe("acesso e conferência", () => {
  it("marcar acesso só grava a 1ª vez", async () => {
    const id = await criarComLink("acesso@exemplo.com");
    await sql(`select public.compra_marcar_acesso($1)`, [id]);
    const antes = (await compra(id)).acesso_enviado_em;
    expect(antes).toBeTruthy();
    await sql(`select public.compra_marcar_acesso($1)`, [id]);
    expect((await compra(id)).acesso_enviado_em).toEqual(antes);
  });

  it("compras_para_conferir acha pendente antigo e aprovado sem acesso", async () => {
    const usuario = await criarUsuario(db, "conferir@exemplo.com");
    const nova = await criarComLink("conferir1@exemplo.com");
    const antiga = await criarComLink("conferir2@exemplo.com");
    const vencida = await criarComLink("conferir3@exemplo.com");
    const semLink = (await criar("conferir4@exemplo.com")).id;
    const aprovada = await criarComLink("conferir@exemplo.com");
    await sql(
      `update public.payments set criado_em = now() - interval '20 minutes' where id = any($1)`,
      [[antiga, semLink]],
    );
    await sql(
      `update public.payments set criado_em = now() - interval '49 hours' where id = $1`,
      [vencida],
    );
    await registrar(aprovada, "mp-c", "aprovar", usuario);

    const ids = (
      await sql<{ id: string }>(`select id from public.compras_para_conferir()`)
    ).map((r) => r.id);
    expect(ids).toContain(antiga);
    expect(ids).toContain(aprovada);
    expect(ids).not.toContain(nova);
    expect(ids).not.toContain(vencida);
    expect(ids).not.toContain(semLink);

    await sql(`select public.compra_marcar_acesso($1)`, [aprovada]);
    const depois = (
      await sql<{ id: string }>(`select id from public.compras_para_conferir()`)
    ).map((r) => r.id);
    expect(depois).not.toContain(aprovada);
  });

  it("admin_listar_compras devolve as últimas, sem o link da cobrança", async () => {
    const linhas = await sql<Record<string, unknown>>(
      `select * from public.admin_listar_compras()`,
    );
    expect(linhas.length).toBeGreaterThan(0);
    expect(linhas.length).toBeLessThanOrEqual(30);
    expect(Object.keys(linhas[0])).not.toContain("mp_link");
  });
});
