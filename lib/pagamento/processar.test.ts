// processarPagamento com o banco de verdade (PGlite, migrations reais) e o Mercado Pago, a
// conta e o e-mail falsos. Confere 1 livro e 1 e-mail por compra, com aviso e volta juntos.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ClienteAdmin } from "@/lib/supabase/admin";
import { criarBanco, criarUsuario } from "@/supabase/tests/banco";
import type { PagamentoMP } from "./mercado-pago";
import { processarPagamento, type Dependencias } from "./processar";

let pg: PGlite;

/** Só o que processar.ts usa do cliente do Supabase, sobre o PGlite. */
function dbFalso(): ClienteAdmin {
  return {
    from: () => ({
      select: (colunas: string) => ({
        eq: (_coluna: string, valor: string) => ({
          maybeSingle: async () => {
            const r = await pg.query(
              `select ${colunas} from public.payments where id = $1`,
              [valor],
            );
            return { data: r.rows[0] ?? null, error: null };
          },
        }),
      }),
    }),
    rpc: async (nome: string, args: Record<string, unknown>) => {
      const chaves = Object.keys(args);
      try {
        const r = await pg.query(
          `select * from public.${nome}(${chaves.map((c, i) => `${c} => $${i + 1}`).join(", ")})`,
          Object.values(args),
        );
        return { data: r.rows, error: null };
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } };
      }
    },
  } as unknown as ClienteAdmin;
}

let pagamentos: Map<string, PagamentoMP>;
let emails: string[];
let alertas: { referencia: string; alerta: string }[];
let eventos: string[];
let falharEmail: boolean;
let conta: "normal" | "recusada";

function deps(): Dependencias {
  return {
    db: dbFalso(),
    consultar: async (id) => pagamentos.get(id) ?? null,
    contaParaEmail: async (email) => {
      if (conta === "recusada") return { tipo: "recusada" };
      const r = await pg.query<{ id: string }>(
        `select id from auth.users where email = $1`,
        [email],
      );
      if (r.rows[0]) return { tipo: "existente", id: r.rows[0].id };
      // Como o Auth: criar o mesmo e-mail duas vezes falha.
      await new Promise((ok) => setTimeout(ok, 5));
      try {
        return { tipo: "criada", id: await criarUsuario(pg, email) };
      } catch {
        return { tipo: "erro" };
      }
    },
    enviarAcesso: async (_livro, _db, opcoes = {}) => {
      if (falharEmail) return { ok: false };
      // O Resend descarta a mesma chave: conta 1 por chave.
      if (emails.includes(opcoes.idempotencyKey ?? ""))
        return { ok: true, repetido: true };
      emails.push(opcoes.idempotencyKey ?? "");
      return { ok: true };
    },
    avisar: async (a) => {
      alertas.push(a);
      return 1;
    },
    registrarEvento: async (e) => {
      eventos.push(e.acao);
      return { ok: true };
    },
  };
}

async function novaCompra(email: string) {
  const r = await pg.query<{ id: string }>(
    `select id from public.compra_criar($1)`,
    [email],
  );
  const id = r.rows[0].id;
  await pg.query(`select public.compra_guardar_preferencia($1, 'p', 'l')`, [
    id,
  ]);
  return id;
}

function pagamento(
  id: string,
  compra: string,
  extra: Partial<PagamentoMP> = {},
): PagamentoMP {
  const p: PagamentoMP = {
    id,
    status: "approved",
    status_detail: "accredited",
    external_reference: compra,
    transaction_amount: 467,
    currency_id: "BRL",
    payment_type_id: "credit_card",
    installments: 3,
    ...extra,
  };
  pagamentos.set(id, p);
  return p;
}

async function linha(id: string) {
  const r = await pg.query<{
    estado: string;
    book_id: string | null;
    alertas: string[];
    acesso_enviado_em: string | null;
  }>(
    `select estado, book_id, alertas, acesso_enviado_em from public.payments where id = $1`,
    [id],
  );
  return r.rows[0];
}

beforeAll(async () => {
  pg = await criarBanco();
});
afterAll(async () => {
  await pg.close();
});
beforeEach(() => {
  pagamentos = new Map();
  emails = [];
  alertas = [];
  eventos = [];
  falharEmail = false;
  conta = "normal";
});

describe("processarPagamento", () => {
  it("aviso e volta ao mesmo tempo: 1 livro, 1 e-mail e 1 evento", async () => {
    const compra = await novaCompra("junto@exemplo.com");
    pagamento("1001", compra);
    const d = deps();
    const [a, b] = await Promise.all([
      processarPagamento("1001", {}, d),
      processarPagamento("1001", { compraEsperada: compra }, d),
    ]);
    expect(a).toMatchObject({ tipo: "ok", estado: "aprovado" });
    expect(b).toMatchObject({ tipo: "ok", estado: "aprovado" });
    const r = await pg.query<{ n: number }>(
      `select count(*)::int as n from public.book_members m join auth.users u on u.id = m.user_id where u.email = 'junto@exemplo.com'`,
    );
    expect(r.rows[0].n).toBe(1);
    expect(emails).toEqual([`compra:${compra}`]);
    expect(eventos).toEqual(["plano_comprado"]);
    expect(alertas).toEqual([]);
    expect((await linha(compra)).acesso_enviado_em).toBeTruthy();
  });

  it("e-mail falhou: acesso vazio e a próxima chamada envia", async () => {
    const compra = await novaCompra("caiu@exemplo.com");
    pagamento("1002", compra);
    falharEmail = true;
    expect(await processarPagamento("1002", {}, deps())).toMatchObject({
      tipo: "passageiro",
    });
    expect(await linha(compra)).toMatchObject({
      estado: "aprovado",
      acesso_enviado_em: null,
    });
    falharEmail = false;
    expect(await processarPagamento("1002", {}, deps())).toMatchObject({
      tipo: "ok",
    });
    expect(emails).toEqual([`compra:${compra}`]);
    expect((await linha(compra)).acesso_enviado_em).toBeTruthy();
    expect(eventos).toEqual(["plano_comprado"]); // o livro nasceu na 1ª chamada
  });

  it("moeda USD: retido, sem criar conta nem livro, alerta 1 vez", async () => {
    const compra = await novaCompra("dolar@exemplo.com");
    pagamento("1003", compra, { currency_id: "USD" });
    await processarPagamento("1003", {}, deps());
    await processarPagamento("1003", {}, deps());
    expect(await linha(compra)).toMatchObject({
      estado: "retido",
      book_id: null,
    });
    const u = await pg.query(
      `select 1 from auth.users where email = 'dolar@exemplo.com'`,
    );
    expect(u.rows).toEqual([]);
    expect(alertas).toEqual([
      { referencia: compra, alerta: "valor_diferente" },
    ]);
    expect(emails).toEqual([]);
  });

  it("conta recusada: retido e alerta", async () => {
    const compra = await novaCompra("recusada@exemplo.com");
    pagamento("1004", compra);
    conta = "recusada";
    await processarPagamento("1004", {}, deps());
    expect(await linha(compra)).toMatchObject({
      estado: "retido",
      book_id: null,
    });
    expect(alertas).toEqual([{ referencia: compra, alerta: "conta_recusada" }]);
  });

  it("volta com o pagamento de outra compra não mexe em nada", async () => {
    const minha = await novaCompra("minha@exemplo.com");
    const outra = await novaCompra("outra@exemplo.com");
    pagamento("1005", outra);
    expect(
      await processarPagamento("1005", { compraEsperada: minha }, deps()),
    ).toEqual({ tipo: "ignorado", motivo: "outra_compra" });
    expect((await linha(outra)).estado).toBe("criado");
  });

  it("pagamento que não existe na nossa conta: ignorado", async () => {
    expect(await processarPagamento("999", {}, deps())).toEqual({
      tipo: "ignorado",
      motivo: "pagamento_inexistente",
    });
  });

  it("Pix pendente e depois aprovado", async () => {
    const compra = await novaCompra("pix@exemplo.com");
    pagamento("1006", compra, {
      status: "pending",
      payment_type_id: "bank_transfer",
      installments: 1,
    });
    expect(await processarPagamento("1006", {}, deps())).toMatchObject({
      estado: "pendente",
    });
    pagamento("1006", compra, {
      payment_type_id: "bank_transfer",
      installments: 1,
    });
    expect(await processarPagamento("1006", {}, deps())).toMatchObject({
      estado: "aprovado",
    });
    expect(emails).toEqual([`compra:${compra}`]);
  });

  it("estorno depois de aprovado: estornado e alerta", async () => {
    const compra = await novaCompra("devolve@exemplo.com");
    pagamento("1007", compra);
    await processarPagamento("1007", {}, deps());
    pagamento("1007", compra, { status: "refunded" });
    expect(await processarPagamento("1007", {}, deps())).toMatchObject({
      estado: "estornado",
    });
    expect(alertas).toEqual([{ referencia: compra, alerta: "estorno" }]);
  });
});
