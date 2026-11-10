// Banco Postgres de verdade, em memória (PGlite), com as migrations reais do projeto.
// O shim imita o que o Supabase já traz pronto: papéis, schema auth e privilégios padrão.
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "..");
const ler = (arquivo: string) => readFileSync(arquivo, "utf8");

function arquivosSql(pasta: string) {
  return readdirSync(path.join(RAIZ, pasta))
    .filter((nome) => nome.endsWith(".sql"))
    .sort()
    .map((nome) => path.join(RAIZ, pasta, nome));
}

export async function criarBanco() {
  const db = new PGlite();
  await db.exec(ler(path.join(RAIZ, "tests/auth-shim.sql")));
  for (const migration of arquivosSql("migrations")) {
    await db.exec(ler(migration));
  }
  return db;
}

export async function reverter(db: PGlite) {
  for (const reversao of arquivosSql("reversao").reverse()) {
    await db.exec(ler(reversao));
  }
}

export type Claims = {
  sub?: string;
  app_metadata?: Record<string, unknown>;
  [k: string]: unknown;
};

export type Papel = "anon" | "authenticated" | "service_role" | "porta_autor";

/** Roda `fn` como um papel do Supabase, com os claims do token. */
export async function como<T>(
  db: PGlite,
  papel: Papel,
  claims: Claims,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(claims),
    ]);
    await tx.exec(`set local role ${papel}`);
    return fn(tx);
  });
}

export type Tentativa =
  { linhas: number; afetadas: number; erro?: undefined } | { erro: string };

/** Executa sem derrubar a transação: um erro volta como `{ erro }`. */
export async function tenta(
  tx: Transaction,
  sql: string,
  params: unknown[] = [],
): Promise<Tentativa> {
  await tx.exec("savepoint tentativa");
  try {
    const r = await tx.query(sql, params);
    await tx.exec("release savepoint tentativa");
    return { linhas: r.rows.length, afetadas: r.affectedRows ?? 0 };
  } catch (e) {
    await tx.exec("rollback to savepoint tentativa");
    return { erro: (e as Error).message };
  }
}

export async function criarUsuario(db: PGlite, email: string) {
  const r = await db.query<{ id: string }>(
    `insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id`,
    [email],
  );
  return r.rows[0].id;
}

export async function ativarPlano(
  db: PGlite,
  usuario: string,
  autor: string,
  meses = 12,
) {
  const r = await db.query<{ id: string }>(
    `select public.admin_ativar_plano($1, $2, $3) as id`,
    [usuario, autor, meses],
  );
  return r.rows[0].id;
}

/** Valor de tentativa que falhou com `codigo` (mensagem exata das funções do banco). */
export function erroCom(codigo: string) {
  return { erro: codigo };
}

const sha256 = async (texto: string) => {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(texto, "utf8").digest("hex");
};

/** Cria (ou troca) o link da família pelo caminho do servidor. Devolve o id da linha. */
export async function criarLinkFamilia(
  db: PGlite,
  livro: string,
  usuario: string,
  token: string,
) {
  const id = crypto.randomUUID();
  await db.query(
    `select public.servico_trocar_link_familia($1, $2, $3, $4, 1::smallint)`,
    [livro, usuario, id, await sha256(token)],
  );
  return id;
}

/** Abre uma enquete com a sessão do usuário e devolve o id dela e dos itens, na ordem. */
export async function abrirEnquete(
  db: PGlite,
  livro: string,
  usuario: string,
  itens: { texto: string; banco_id?: string; causo_id?: string }[],
) {
  return como(db, "authenticated", { sub: usuario }, async (tx) => {
    const r = await tx.query<{ id: string }>(
      `select public.enquete_abrir($1, $2::jsonb) as id`,
      [livro, JSON.stringify(itens)],
    );
    const enquete = r.rows[0].id;
    const i = await tx.query<{ id: string }>(
      `select id from public.poll_items where poll_id = $1 order by ordem`,
      [enquete],
    );
    return { enquete, itens: i.rows.map((x) => x.id) };
  });
}

/** Põe o plano do livro como vencido (estado ativo, data passada). */
export async function vencerPlano(db: PGlite, livro: string) {
  await db.query(
    `update public.books set plano_ativado_em = now() - interval '2 years', plano_vence_em = now() - interval '1 day' where id = $1`,
    [livro],
  );
}
