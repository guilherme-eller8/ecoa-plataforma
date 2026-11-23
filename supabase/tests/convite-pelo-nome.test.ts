// Convite pelo nome (P81, T59). Design: docs/designs/convite-pelo-nome.md, seção 8.
import { createHash, randomBytes } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as config from "@/lib/config";
import { ativarPlano, como, criarBanco, type Papel } from "./banco";

let db: PGlite;
let ana: string; // responsável do livro A
let beto: string; // responsável do livro B
let caio: string; // co-facilitador do livro A
let livroA: string;
let livroB: string;

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const dono = () => hash(randomBytes(16).toString("hex"));

async function sql<T = Record<string, unknown>>(q: string, p: unknown[] = []) {
  return (await db.query<T>(q, p)).rows;
}

type Resposta =
  | { linhas: Record<string, unknown>[]; erro?: undefined }
  | { erro: string; linhas?: undefined };

async function comoPapel(
  papel: Papel,
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
const servico = (q: string, p: unknown[] = []) =>
  comoPapel("service_role", null, q, p);
const membro = (u: string, q: string, p: unknown[] = []) =>
  comoPapel("authenticated", u, q, p);

async function usuario(email: string) {
  const [{ id }] = await sql<{ id: string }>(
    `insert into auth.users (id, email, email_confirmed_at) values (gen_random_uuid(), $1, now()) returning id`,
    [email],
  );
  return id;
}

/** Cria o convite pelo nome como o servidor faz. O token é o próprio id (só no teste). */
async function convidar(livro: string, por: string, nome: string) {
  const id = crypto.randomUUID();
  const r = await servico(
    `select public.servico_criar_convite_nome($1, $2, $3, $4, $5, 1::smallint)`,
    [livro, por, id, nome, hash(id)],
  );
  return { id, token: hash(id), erro: r.erro };
}

const pode = (token: string, email: string, d: string | null = null) =>
  servico(`select public.servico_pode_definir_email($1, $2, $3) as r`, [
    token,
    email,
    d,
  ]);
const definir = (token: string, email: string, d: string) =>
  servico(`select public.servico_definir_email_convite($1, $2, $3) as r`, [
    token,
    email,
    d,
  ]);
const ler = async (token: string, d: string | null = null) =>
  (
    await servico(`select * from public.servico_ler_convite($1, $2)`, [
      token,
      d,
    ])
  ).linhas?.[0];
const convite = async (id: string) =>
  (
    await sql<{
      email: string | null;
      email_trocas: number;
      dono_hash: string | null;
      revogado_em: string | null;
      aceito_em: string | null;
    }>(`select * from public.book_invites where id = $1`, [id])
  )[0];

async function limparConvites(livro: string) {
  await sql(`delete from public.book_invites where book_id = $1`, [livro]);
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await usuario("ana@exemplo.com");
  beto = await usuario("beto@exemplo.com");
  caio = await usuario("caio@exemplo.com");
  livroA = await ativarPlano(db, ana, "Jair");
  livroB = await ativarPlano(db, beto, "Rosa");
  await sql(
    `insert into public.book_members (book_id, user_id, papel) values ($1, $2, 'cofacilitador')`,
    [livroA, caio],
  );
});
afterAll(async () => db?.close());

describe("criar pelo nome", () => {
  it("só o responsável cria; nome vazio, com espaço nas pontas ou longo não passa", async () => {
    expect((await convidar(livroA, caio, "Maria")).erro).toBe("sem_permissao");
    expect((await convidar(livroA, beto, "Maria")).erro).toBe("sem_permissao");
    expect((await convidar(livroA, ana, "")).erro).toBe("dados_invalidos");
    expect((await convidar(livroA, ana, " Maria")).erro).toBe(
      "dados_invalidos",
    );
    expect((await convidar(livroA, ana, "M".repeat(31))).erro).toBe(
      "dados_invalidos",
    );
    const c = await convidar(livroA, ana, "Maria");
    expect(c.erro).toBeUndefined();
    const l = await ler(c.token);
    expect(l).toMatchObject({
      nome: "Maria",
      email: null,
      email_definido: false,
      estado: "pendente",
      trocas_restantes: config.CONVITE_TROCAS_EMAIL,
      e_dono: false,
      autor: "Jair",
    });
    await limparConvites(livroA);
  });

  it("pendente pelo nome conta no teto de 5", async () => {
    // Caio já é co-facilitador: sobram 4 vagas.
    for (const n of ["A", "B", "C", "D"]) {
      expect((await convidar(livroA, ana, n)).erro).toBeUndefined();
    }
    expect((await convidar(livroA, ana, "E")).erro).toBe(
      "limite_cofacilitadores",
    );
    await limparConvites(livroA);
  });
});

describe("o convidado define o e-mail", () => {
  it("primeira definição grava e-mail, dono e evento, sem contar troca; o mesmo e-mail de novo não muda nada", async () => {
    const c = await convidar(livroA, ana, "Maria");
    const d = dono();
    expect((await pode(c.token, " Maria@Exemplo.com ")).linhas?.[0].r).toBe(
      "definir",
    );
    expect(
      (await definir(c.token, " Maria@Exemplo.com ", d)).linhas?.[0].r,
    ).toBe("definir");
    const i = await convite(c.id);
    expect(i).toMatchObject({
      email: "maria@exemplo.com",
      email_trocas: 0,
      dono_hash: d,
    });
    const ev = await sql(
      `select ator_tipo from public.events where acao = 'convite_email_definido' and detalhes ->> 'convite_id' = $1`,
      [c.id],
    );
    expect(ev).toEqual([{ ator_tipo: "sistema" }]);

    // Outro aparelho com o mesmo e-mail: 'mesmo', nada muda.
    expect(
      (await definir(c.token, "maria@exemplo.com", dono())).linhas?.[0].r,
    ).toBe("mesmo");
    expect((await convite(c.id)).dono_hash).toBe(d);
    expect(await ler(c.token, d)).toMatchObject({
      email_definido: true,
      e_dono: true,
    });
    expect((await ler(c.token, dono()))?.e_dono).toBe(false);
    await limparConvites(livroA);
  });

  it("correção sem o dono dá convite_em_uso; com o dono, 3 passam e a 4ª não", async () => {
    const c = await convidar(livroA, ana, "Maria");
    const d = dono();
    await definir(c.token, "m0@exemplo.com", d);
    expect((await pode(c.token, "outro@exemplo.com")).erro).toBe(
      "convite_em_uso",
    );
    expect((await definir(c.token, "outro@exemplo.com", dono())).erro).toBe(
      "convite_em_uso",
    );
    for (const n of [1, 2, 3]) {
      expect(
        (await definir(c.token, `m${n}@exemplo.com`, d)).linhas?.[0].r,
      ).toBe("definir");
    }
    expect((await convite(c.id)).email_trocas).toBe(3);
    expect((await ler(c.token, d))?.trocas_restantes).toBe(0);
    expect((await definir(c.token, "m4@exemplo.com", d)).erro).toBe(
      "limite_trocas_email",
    );
    expect((await convite(c.id)).email).toBe("m3@exemplo.com");
    await limparConvites(livroA);
  });

  it("4ª definição do mesmo e-mail em 24 h dá limite_convites", async () => {
    for (let n = 0; n < config.MAX_CONVITES_POR_EMAIL_DIA; n++) {
      const c = await convidar(livroB, beto, `P${n}`);
      expect(
        (await definir(c.token, "repetido@exemplo.com", dono())).erro,
      ).toBeUndefined();
    }
    const c = await convidar(livroA, ana, "Outra");
    expect((await pode(c.token, "repetido@exemplo.com")).erro).toBe(
      "limite_convites",
    );
    expect((await definir(c.token, "repetido@exemplo.com", dono())).erro).toBe(
      "limite_convites",
    );
    await limparConvites(livroA);
    await limparConvites(livroB);
  });

  it("e-mail de quem já está no livro dá 'ignorar' e não grava; pendente antigo do mesmo e-mail é revogado", async () => {
    const c = await convidar(livroA, ana, "Caio");
    expect(
      (await definir(c.token, "caio@exemplo.com", dono())).linhas?.[0].r,
    ).toBe("ignorar");
    expect((await convite(c.id)).email).toBeNull();

    const velho = await convidar(livroA, ana, "Lu");
    await definir(velho.token, "lu@exemplo.com", dono());
    const novo = await convidar(livroA, ana, "Lu de novo");
    expect(
      (await definir(novo.token, "lu@exemplo.com", dono())).linhas?.[0].r,
    ).toBe("definir");
    expect((await convite(velho.id)).revogado_em).not.toBeNull();
    expect((await convite(novo.id)).revogado_em).toBeNull();
    await limparConvites(livroA);
  });

  it("convite vencido, cancelado, aceito ou antigo (sem nome) dá convite_invalido", async () => {
    const vencido = await convidar(livroA, ana, "V");
    await sql(
      `update public.book_invites set criado_em = now() - interval '8 days', expira_em = now() - interval '1 day' where id = $1`,
      [vencido.id],
    );
    expect((await definir(vencido.token, "v@exemplo.com", dono())).erro).toBe(
      "convite_invalido",
    );
    expect((await ler(vencido.token))?.estado).toBe("vencido");

    const cancelado = await convidar(livroA, ana, "C");
    await sql(
      `update public.book_invites set revogado_em = now() where id = $1`,
      [cancelado.id],
    );
    expect((await pode(cancelado.token, "c@exemplo.com")).erro).toBe(
      "convite_invalido",
    );

    const aceito = await convidar(livroA, ana, "Ac");
    const ac = await usuario("ac@exemplo.com");
    await membro(ac, `select * from public.definir_e_aceitar_convite($1)`, [
      aceito.token,
    ]);
    expect((await definir(aceito.token, "x@exemplo.com", dono())).erro).toBe(
      "convite_invalido",
    );
    await sql(`delete from public.book_members where user_id = $1`, [ac]);

    const antigoId = crypto.randomUUID();
    await sql(
      `insert into public.book_invites (id, book_id, email, token_hash, chave_versao, criado_por, expira_em)
       values ($1, $2, 'antigo@exemplo.com', $3, 1, $4, now() + interval '7 days')`,
      [antigoId, livroA, hash(antigoId), ana],
    );
    expect((await definir(hash(antigoId), "y@exemplo.com", dono())).erro).toBe(
      "convite_invalido",
    );
    expect((await pode("nao-e-hash", "y@exemplo.com")).erro).toBe(
      "convite_invalido",
    );
    expect(
      (await definir(hash("nao-existe"), "y@exemplo.com", dono())).erro,
    ).toBe("convite_invalido");
    await limparConvites(livroA);
  });
});

describe("aceitar", () => {
  it("aceitar_convite de convite pelo nome sem e-mail não passa; depois de definido, só a conta certa", async () => {
    const c = await convidar(livroA, ana, "Dani");
    const dani = await usuario("dani@exemplo.com");
    const outra = await usuario("outra@exemplo.com");
    expect(
      (await membro(dani, `select public.aceitar_convite($1)`, [c.id])).erro,
    ).toBe("convite_invalido");
    await definir(c.token, "dani@exemplo.com", dono());
    expect(
      (await membro(outra, `select public.aceitar_convite($1)`, [c.id])).erro,
    ).toBe("convite_invalido");
    const ok = await membro(dani, `select public.aceitar_convite($1) as l`, [
      c.id,
    ]);
    expect(ok.linhas?.[0].l).toBe(livroA);
    await sql(`delete from public.book_members where user_id = $1`, [dani]);
    await limparConvites(livroA);
  });

  it("definir_e_aceitar_convite define e aceita de uma vez, com o e-mail da sessão", async () => {
    const c = await convidar(livroA, ana, "Eva");
    const eva = await usuario("Eva@Exemplo.com");
    const r = await membro(
      eva,
      `select * from public.definir_e_aceitar_convite($1)`,
      [c.token],
    );
    expect(r.linhas?.[0]).toEqual({ livro_id: livroA, definiu: true });
    expect(await convite(c.id)).toMatchObject({ email: "eva@exemplo.com" });
    expect((await convite(c.id)).aceito_em).not.toBeNull();
    const m = await sql(
      `select papel from public.book_members where book_id = $1 and user_id = $2`,
      [livroA, eva],
    );
    expect(m).toEqual([{ papel: "cofacilitador" }]);
    // De novo: idempotente.
    const r2 = await membro(
      eva,
      `select * from public.definir_e_aceitar_convite($1)`,
      [c.token],
    );
    expect(r2.linhas?.[0]).toEqual({ livro_id: livroA, definiu: false });
    await sql(`delete from public.book_members where user_id = $1`, [eva]);
    await limparConvites(livroA);
  });

  it("com e-mail de outra pessoa: sem dono dá convite_em_uso; com o dono, troca e aceita", async () => {
    const c = await convidar(livroA, ana, "Fábio");
    const d = dono();
    await definir(c.token, "fabio.errado@exemplo.com", d);
    const fabio = await usuario("fabio@exemplo.com");
    expect(
      (
        await membro(
          fabio,
          `select * from public.definir_e_aceitar_convite($1)`,
          [c.token],
        )
      ).erro,
    ).toBe("convite_em_uso");
    const r = await membro(
      fabio,
      `select * from public.definir_e_aceitar_convite($1, $2)`,
      [c.token, d],
    );
    expect(r.linhas?.[0]).toEqual({ livro_id: livroA, definiu: true });
    expect(await convite(c.id)).toMatchObject({
      email: "fabio@exemplo.com",
      email_trocas: 1,
    });
    await sql(`delete from public.book_members where user_id = $1`, [fabio]);
    await limparConvites(livroA);
  });

  it("quem já é membro recebe o livro sem duplicar; o teto é conferido de novo", async () => {
    const c = await convidar(livroA, ana, "Caio");
    const r = await membro(
      caio,
      `select * from public.definir_e_aceitar_convite($1)`,
      [c.token],
    );
    expect(r.linhas?.[0]).toEqual({ livro_id: livroA, definiu: false });
    const n = await sql(
      `select count(*)::int as n from public.book_members where book_id = $1 and user_id = $2`,
      [livroA, caio],
    );
    expect(n[0]).toEqual({ n: 1 });
    expect((await convite(c.id)).email).toBeNull();

    // Teto: 4 vagas ocupadas por membros entrando por fora; o convite criado antes fica sem vaga.
    const conv = await convidar(livroA, ana, "Última");
    const extras: string[] = [];
    for (const k of [1, 2, 3, 4]) {
      const u = await usuario(`extra${k}@exemplo.com`);
      extras.push(u);
      await sql(
        `insert into public.book_members (book_id, user_id, papel) values ($1, $2, 'cofacilitador')`,
        [livroA, u],
      );
    }
    const ult = await usuario("ultima@exemplo.com");
    expect(
      (
        await membro(
          ult,
          `select * from public.definir_e_aceitar_convite($1)`,
          [conv.token],
        )
      ).erro,
    ).toBe("limite_cofacilitadores");
    // A transação desfez a definição.
    expect((await convite(conv.id)).email).toBeNull();
    await sql(`delete from public.book_members where user_id = any($1)`, [
      extras,
    ]);
    await limparConvites(livroA);
  });

  it("sem e-mail confirmado não aceita", async () => {
    const c = await convidar(livroA, ana, "Gil");
    const [{ id: gil }] = await sql<{ id: string }>(
      `insert into auth.users (id, email) values (gen_random_uuid(), 'gil@exemplo.com') returning id`,
    );
    expect(
      (
        await membro(
          gil,
          `select * from public.definir_e_aceitar_convite($1)`,
          [c.token],
        )
      ).erro,
    ).toBe("sem_permissao");
    await limparConvites(livroA);
  });
});

describe("privilégios", () => {
  const novas: [string, unknown[]][] = [
    [
      `select public.servico_criar_convite_nome($1, $2, gen_random_uuid(), 'X', $3, 1::smallint)`,
      [livroA, ana, hash("x")],
    ],
    [
      `select public.servico_pode_definir_email($1, 'a@b.com', null)`,
      [hash("x")],
    ],
    [
      `select public.servico_definir_email_convite($1, 'a@b.com', $1)`,
      [hash("x")],
    ],
    [`select * from public.servico_ler_convite($1)`, [hash("x")]],
  ];

  it.each(["anon", "authenticated", "porta_autor"] as const)(
    "%s não executa nenhuma servico_* nova",
    async (papel) => {
      for (const [q, p] of novas) {
        const r = await comoPapel(papel, ana, q, p);
        expect(r.erro).toMatch(/permission denied/);
      }
    },
  );

  it("anon e porta_autor não executam definir_e_aceitar_convite", async () => {
    for (const papel of ["anon", "porta_autor"] as const) {
      const r = await comoPapel(
        papel,
        null,
        `select * from public.definir_e_aceitar_convite($1)`,
        [hash("x")],
      );
      expect(r.erro).toMatch(/permission denied/);
    }
  });

  it("authenticated não lê token_hash, dono_hash nem email_trocas; lê nome e email_definido_em", async () => {
    for (const col of ["token_hash", "dono_hash", "email_trocas"]) {
      const r = await membro(ana, `select ${col} from public.book_invites`);
      expect(r.erro).toMatch(/permission denied/);
    }
    expect(
      (
        await membro(
          ana,
          `select nome, email_definido_em from public.book_invites`,
        )
      ).erro,
    ).toBeUndefined();
  });

  it("service_role não executa mais o convite por e-mail", async () => {
    const r = await servico(
      `select public.servico_criar_convite($1, $2, gen_random_uuid(), 'a@b.com', $3, 1::smallint)`,
      [livroA, ana, hash("y")],
    );
    expect(r.erro).toMatch(/permission denied/);
    const r2 = await servico(
      `select public.servico_pode_convidar($1, $2, 'a@b.com')`,
      [livroA, ana],
    );
    expect(r2.erro).toMatch(/permission denied/);
  });
});

describe("reversão", () => {
  it("desce com convites pelo nome (apaga os sem e-mail, mantém os definidos) e sobe de novo", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const raiz = path.resolve(__dirname, "..");
    const semEmail = await convidar(livroA, ana, "Sem");
    const comEmail = await convidar(livroA, ana, "Com");
    await definir(comEmail.token, "com@exemplo.com", dono());
    await db.exec(
      readFileSync(
        path.join(raiz, "reversao/20261202120000_convite_pelo_nome.down.sql"),
        "utf8",
      ),
    );
    const ids = (
      await sql<{ id: string }>(`select id from public.book_invites`)
    ).map((r) => r.id);
    expect(ids).toContain(comEmail.id);
    expect(ids).not.toContain(semEmail.id);
    await db.exec(
      readFileSync(
        path.join(raiz, "migrations/20261202120000_convite_pelo_nome.sql"),
        "utf8",
      ),
    );
  });
});
