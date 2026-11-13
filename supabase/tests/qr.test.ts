// QR permanente, player público e family_messages vazia (prompt 10).
// Design: docs/designs/qr-pagina-amostra.md.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ativarPlano, como, criarBanco, criarUsuario, tenta } from "./banco";

const RAIZ = path.resolve(__dirname, "..");
const up = readFileSync(
  path.join(RAIZ, "migrations/20261120120000_qr_amostra.sql"),
  "utf8",
);
const down = readFileSync(
  path.join(RAIZ, "reversao/20261120120000_qr_amostra.down.sql"),
  "utf8",
);

let db: PGlite;
let ana: string; // responsável do livro A
let beto: string; // responsável do livro B
let livroA: string;
let livroB: string;

const CHAVE = "a".repeat(64);
const chave = (n: number) => n.toString(16).padStart(64, "0");

async function sql<T = Record<string, unknown>>(q: string, p: unknown[] = []) {
  return (await db.query<T>(q, p)).rows;
}

type Resposta =
  | { linhas: Record<string, unknown>[]; erro?: undefined }
  | { erro: string; linhas?: undefined };

async function comoMembro(
  usuario: string,
  q: string,
  p: unknown[] = [],
): Promise<Resposta> {
  return como(db, "authenticated", { sub: usuario }, async (tx) => {
    await tx.exec("savepoint membro");
    try {
      const linhas = (await tx.query<Record<string, unknown>>(q, p)).rows;
      await tx.exec("release savepoint membro");
      return { linhas };
    } catch (e) {
      await tx.exec("rollback to savepoint membro");
      return { erro: (e as Error).message };
    }
  });
}

async function servico<T = Record<string, unknown>>(
  q: string,
  p: unknown[] = [],
) {
  return como(db, "service_role", {}, async (tx) => {
    await tx.exec("savepoint s");
    try {
      const linhas = (await tx.query<T>(q, p)).rows;
      await tx.exec("release savepoint s");
      return { linhas };
    } catch (e) {
      await tx.exec("rollback to savepoint s");
      return { erro: (e as Error).message, linhas: [] as T[] };
    }
  });
}

/** História pronta (IA terminou), com 1 gravação usada por inteiro. */
async function historia(livro: string, revisada = true, comAudio = true) {
  const [{ id }] = await sql<{ id: string }>(
    `insert into public.stories (book_id, estado, pronta_em, titulo, ano, revisada_em)
     values ($1, 'pronta', now(), 'O trem', 1962, $2) returning id`,
    [livro, revisada ? new Date().toISOString() : null],
  );
  if (comAudio) {
    const g = crypto.randomUUID();
    await sql(
      `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes,
        duracao_s, upload, recebido_em)
       values ($1, $2, 'upload', 'a.m4a', $3, 'audio/mp4', 100, 120, 'recebido', now())`,
      [g, livro, `livros/${livro}/audios/${g}.m4a`],
    );
    await sql(
      `insert into public.story_recordings (story_id, recording_id, book_id, ordem) values ($1, $2, $3, 1)`,
      [id, g, livro],
    );
  }
  return id;
}

async function criarQr(usuario: string, story: string, codigo: string) {
  return comoMembro(
    usuario,
    `select codigo, precisa_audio from public.criar_qr($1, $2)`,
    [story, codigo],
  );
}

async function fonte(story: string) {
  const [r] = await sql<{ f: string }>(
    `select privado.fonte_audio_da_historia($1) as f`,
    [story],
  );
  return r.f;
}

async function ouvir(codigo: string, k = CHAVE) {
  const r = await servico<{ r: Record<string, unknown> }>(
    `select public.servico_ouvir_qr($1, $2) as r`,
    [codigo, k],
  );
  return r.linhas[0]?.r ?? { erro: (r as { erro?: string }).erro };
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Jair");
  livroB = await ativarPlano(db, beto, "Nelson");
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("family_messages nasce fechada", () => {
  it.each(["anon", "authenticated", "porta_autor"])(
    "%s não tem nenhum privilégio",
    async (papel) => {
      const r = await sql<{ algum: boolean }>(
        `select has_table_privilege($1, 'public.family_messages', 'select, insert, update, delete') as algum`,
        [papel],
      );
      expect(r[0].algum).toBe(false);
    },
  );

  it("RLS ligada e nenhuma política", async () => {
    const [t] = await sql<{ rls: boolean }>(
      `select relrowsecurity as rls from pg_class where oid = 'public.family_messages'::regclass`,
    );
    expect(t.rls).toBe(true);
    const p = await sql(
      `select 1 from pg_policies where tablename = 'family_messages'`,
    );
    expect(p).toEqual([]);
  });

  it("um membro logado não lê nem com uma mensagem guardada", async () => {
    await sql(`insert into public.family_messages (book_id) values ($1)`, [
      livroA,
    ]);
    const r = await comoMembro(ana, `select * from public.family_messages`);
    expect(r.erro).toMatch(/permission denied/);
    await sql(`delete from public.family_messages`);
  });
});

describe("criar_qr", () => {
  it("só membro do livro, com plano ativo", async () => {
    const s = await historia(livroA);
    expect(await criarQr(beto, s, "AAAA2222")).toEqual({
      erro: "sem_permissao",
    });
    const anon = await como(db, "anon", {}, (tx) =>
      tenta(tx, `select public.criar_qr($1, 'AAAA2222')`, [s]),
    );
    expect(anon.erro).toMatch(/permission denied/);
  });

  it("história não marcada como pronta ou sem áudio: recusa", async () => {
    const s = await historia(livroA, false);
    expect(await criarQr(ana, s, "BBBB2222")).toEqual({
      erro: "historia_nao_pronta",
    });
    const semAudio = await historia(livroA, true, false);
    expect(await criarQr(ana, semAudio, "BBBB2223")).toEqual({
      erro: "historia_sem_audio",
    });
  });

  it("código fora do alfabeto (0, 1, I, L, O, minúscula) é recusado", async () => {
    const s = await historia(livroA);
    for (const c of ["ABCD0123", "ABCDEFGI", "abcd2345", "ABC2345"])
      expect(await criarQr(ana, s, c)).toEqual({ erro: "qr_codigo_invalido" });
  });

  it("cria uma vez; o segundo pedido devolve o mesmo código e não pede áudio de novo", async () => {
    const s = await historia(livroA);
    const r1 = await criarQr(ana, s, "CCCC2222");
    expect(r1.linhas).toEqual([{ codigo: "CCCC2222", precisa_audio: true }]);
    const r2 = await criarQr(ana, s, "DDDD2222");
    expect(r2.linhas).toEqual([{ codigo: "CCCC2222", precisa_audio: false }]);
  });

  it("código já usado por outra história: qr_colisao (o servidor sorteia outro)", async () => {
    const s = await historia(livroA);
    expect(await criarQr(ana, s, "CCCC2222")).toEqual({ erro: "qr_colisao" });
  });

  it("plano vencido: não cria", async () => {
    const carla = await criarUsuario(db, "carla@exemplo.com");
    const livro = await ativarPlano(db, carla, "Zé");
    const s = await historia(livro);
    await sql(
      `update public.books set plano_ativado_em = now() - interval '13 months', plano_vence_em = now() - interval '1 day' where id = $1`,
      [livro],
    );
    expect(await criarQr(carla, s, "EEEE2222")).toEqual({
      erro: "sem_permissao",
    });
  });
});

describe("recorte de áudio", () => {
  it("só grava o recorte da fonte atual; recorte velho não sobrescreve", async () => {
    const s = await historia(livroA);
    await criarQr(ana, s, "FFFF2222");
    const velha = await fonte(s);
    // a história ganha mais um áudio depois do pedido
    const g = crypto.randomUUID();
    await sql(
      `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes,
        duracao_s, upload, recebido_em)
       values ($1, $2, 'upload', 'b.m4a', $3, 'audio/mp4', 100, 60, 'recebido', now())`,
      [g, livroA, `livros/${livroA}/audios/${g}.m4a`],
    );
    await sql(
      `insert into public.story_recordings (story_id, recording_id, book_id, ordem) values ($1, $2, $3, 2)`,
      [s, g, livroA],
    );
    const caminho = `livros/${livroA}/qr/FFFF2222-${"a".repeat(12)}.m4a`;
    const r1 = await servico(
      `select public.servico_qr_audio_pronto($1, $2, $3) as ok`,
      ["FFFF2222", caminho, velha],
    );
    expect(r1.linhas).toEqual([{ ok: false }]);
    const r2 = await servico(
      `select public.servico_qr_audio_pronto($1, $2, $3) as ok`,
      ["FFFF2222", caminho, await fonte(s)],
    );
    expect(r2.linhas).toEqual([{ ok: true }]);
  });

  it("recorte de outro livro é recusado pelo CHECK", async () => {
    const s = await historia(livroA);
    await criarQr(ana, s, "GGGG2222");
    const r = await servico(
      `select public.servico_qr_audio_pronto($1, $2, $3)`,
      [
        "GGGG2222",
        `livros/${livroB}/qr/GGGG2222-${"b".repeat(12)}.m4a`,
        await fonte(s),
      ],
    );
    expect(r.erro).toMatch(/qr_codes_audio_do_livro/);
  });

  it("a história mudou: o próximo criar_qr pede o recorte de novo", async () => {
    const s = await historia(livroA);
    await criarQr(ana, s, "HHHH2222");
    await servico(`select public.servico_qr_audio_pronto($1, $2, $3)`, [
      "HHHH2222",
      `livros/${livroA}/qr/HHHH2222-${"c".repeat(12)}.m4a`,
      await fonte(s),
    ]);
    expect((await criarQr(ana, s, "ZZZZ2222")).linhas).toEqual([
      { codigo: "HHHH2222", precisa_audio: false },
    ]);
    await sql(
      `update public.story_recordings set segmentos = '{1,2}' where story_id = $1`,
      [s],
    );
    expect((await criarQr(ana, s, "ZZZZ2222")).linhas).toEqual([
      { codigo: "HHHH2222", precisa_audio: true },
    ]);
  });
});

describe("nunca apagado", () => {
  it("nem a chave secreta apaga, troca o código ou o destino", async () => {
    const s = await historia(livroA);
    await criarQr(ana, s, "JJJJ2222");
    const outra = await historia(livroA);
    for (const q of [
      `delete from public.qr_codes where codigo = 'JJJJ2222'`,
      `update public.qr_codes set codigo = 'JJJJ3333' where codigo = 'JJJJ2222'`,
      `update public.qr_codes set story_id = '${outra}' where codigo = 'JJJJ2222'`,
      `truncate public.qr_codes`,
    ]) {
      const r = await servico(q);
      expect(r.erro).toMatch(/qr_imutavel|permission denied/);
    }
    const ok = await servico(
      `update public.qr_codes set desativado_em = now() where codigo = 'JJJJ2222'`,
    );
    expect(ok.erro).toBeUndefined();
  });

  it("o membro lê só os QR do próprio livro e não escreve direto", async () => {
    const s = await historia(livroB);
    await criarQr(beto, s, "KKKK2222");
    const r = await comoMembro(ana, `select codigo from public.qr_codes`);
    expect(r.linhas?.map((x) => x.codigo)).not.toContain("KKKK2222");
    const w = await comoMembro(
      ana,
      `insert into public.qr_codes (codigo, book_id, story_id) values ('MMMM2222', $1, $2)`,
      [livroA, await historia(livroA)],
    );
    expect(w.erro).toMatch(/permission denied/);
  });
});

describe("servico_ouvir_qr (o player)", () => {
  it("anon e authenticated não chamam", async () => {
    for (const papel of ["anon", "authenticated"] as const) {
      const r = await como(db, papel, { sub: ana }, (tx) =>
        tenta(tx, `select public.servico_ouvir_qr('CCCC2222', $1)`, [CHAVE]),
      );
      expect(r.erro).toMatch(/permission denied/);
    }
  });

  it("estados: não encontrado, preparando, ok (com título e ano), desativado", async () => {
    expect(await ouvir("NNNN2222", chave(1))).toEqual({
      estado: "nao_encontrado",
    });
    expect(await ouvir("nao-vale", chave(1))).toEqual({
      estado: "nao_encontrado",
    });
    const s = await historia(livroA);
    await criarQr(ana, s, "PPPP2222");
    expect(await ouvir("PPPP2222", chave(1))).toEqual({
      estado: "preparando",
    });
    const caminho = `livros/${livroA}/qr/PPPP2222-${"d".repeat(12)}.m4a`;
    await servico(`select public.servico_qr_audio_pronto($1, $2, $3)`, [
      "PPPP2222",
      caminho,
      await fonte(s),
    ]);
    expect(await ouvir("PPPP2222", chave(1))).toEqual({
      estado: "ok",
      titulo: "O trem",
      ano: 1962,
      audio_caminho: caminho,
    });
    await sql(
      `update public.qr_codes set desativado_em = now() where codigo = 'PPPP2222'`,
    );
    expect(await ouvir("PPPP2222", chave(1))).toEqual({ estado: "desativado" });
  });

  it("funciona com o plano vencido", async () => {
    const s = await historia(livroB);
    await criarQr(beto, s, "QQQQ2222");
    await servico(`select public.servico_qr_audio_pronto($1, $2, $3)`, [
      "QQQQ2222",
      `livros/${livroB}/qr/QQQQ2222-${"e".repeat(12)}.m4a`,
      await fonte(s),
    ]);
    await sql(
      `update public.books set plano_ativado_em = now() - interval '13 months', plano_vence_em = now() - interval '1 day' where id = $1`,
      [livroB],
    );
    expect((await ouvir("QQQQ2222", chave(2))).estado).toBe("ok");
  });

  it("registra a abertura no events, só com ids", async () => {
    const [e] = await sql<{ detalhes: Record<string, string> }>(
      `select detalhes from public.events where acao = 'qr_aberto' order by id desc limit 1`,
    );
    expect(Object.keys(e.detalhes)).toEqual(["story_id"]);
  });

  it("mais de 30 consultas no mesmo minuto pela mesma chave: limite; outra chave segue", async () => {
    const k = chave(99);
    const estados: string[] = [];
    for (let i = 0; i < 31; i++)
      estados.push(String((await ouvir("RRRR2222", k)).estado));
    expect(estados.slice(0, 30).every((e) => e === "nao_encontrado")).toBe(
      true,
    );
    expect(estados[30]).toBe("limite");
    expect((await ouvir("RRRR2222", chave(100))).estado).toBe("nao_encontrado");
  });

  it("chave que não é hash: recusa", async () => {
    expect((await ouvir("CCCC2222", "1.2.3.4")).erro).toMatch(/chave_invalida/);
  });
});

describe("reversão", () => {
  it("trava com QR criado; forçada passa; sobe de novo", async () => {
    await expect(db.exec(down)).rejects.toThrow(/reversao_com_qr/);
    await db.exec(`set ecoa.reversao_destrutiva = 'sim'`);
    await db.exec(down);
    await db.exec(up);
    await db.exec(down);
    await db.exec(`reset ecoa.reversao_destrutiva`);
  }, 60_000);
});
