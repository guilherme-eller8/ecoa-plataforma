// QR permanente, player público e family_messages vazia (prompt 10).
// Design: docs/designs/qr-pagina-amostra.md (v2).
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

const chave = (n: number) => n.toString(16).padStart(64, "f");
const ALFABETO = /^[2-9A-HJKMNP-Z]{8}$/;

async function sql<T = Record<string, unknown>>(q: string, p: unknown[] = []) {
  return (await db.query<T>(q, p)).rows;
}

type Resposta =
  | { linhas: Record<string, unknown>[]; erro?: undefined }
  | { erro: string; linhas?: undefined };

async function comoPapel(
  papel: "authenticated" | "service_role",
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
const comoMembro = (u: string, q: string, p: unknown[] = []) =>
  comoPapel("authenticated", u, q, p);
const servico = (q: string, p: unknown[] = []) =>
  comoPapel("service_role", null, q, p);

async function gravacao(livro: string, story: string, ordem: number) {
  const g = crypto.randomUUID();
  await sql(
    `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes,
      duracao_s, upload, recebido_em)
     values ($1, $2, 'upload', 'a.m4a', $3, 'audio/mp4', 100, 120, 'recebido', now())`,
    [g, livro, `livros/${livro}/audios/${g}.m4a`],
  );
  await sql(
    `insert into public.story_recordings (story_id, recording_id, book_id, ordem) values ($1, $2, $3, $4)`,
    [story, g, livro, ordem],
  );
  return g;
}

/** História pronta (IA terminou), com 1 gravação de 120 s usada por inteiro. */
async function historia(livro: string, revisada = true, comAudio = true) {
  const [{ id }] = await sql<{ id: string }>(
    `insert into public.stories (book_id, estado, pronta_em, titulo, ano, revisada_em)
     values ($1, 'pronta', now(), 'O trem', 1962, $2) returning id`,
    [livro, revisada ? new Date().toISOString() : null],
  );
  if (comAudio) await gravacao(livro, id, 1);
  return id;
}

async function criarQr(usuario: string, story: string) {
  return comoMembro(
    usuario,
    `select codigo, audio_pronto, pedir_audio from public.criar_qr($1)`,
    [story],
  );
}

async function qrDe(usuario: string, story: string) {
  const r = await criarQr(usuario, story);
  return String(r.linhas?.[0]?.codigo);
}

async function fonte(story: string) {
  const [r] = await sql<{ f: string }>(
    `select privado.fonte_audio_da_historia($1) as f`,
    [story],
  );
  return r.f;
}

async function recortar(
  codigo: string,
  livro: string,
  story: string,
  dur = 100,
) {
  return servico(
    `select gravado, anterior from public.servico_qr_audio_pronto($1, $2, $3, $4)`,
    [
      codigo,
      `livros/${livro}/${codigo}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}.m4a`,
      await fonte(story),
      dur,
    ],
  );
}

async function ouvir(codigo: string, k: string) {
  const r = await servico(`select public.servico_ouvir_qr($1, $2) as r`, [
    codigo,
    k,
  ]);
  return (r.linhas?.[0]?.r as Record<string, unknown>) ?? { erro: r.erro };
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
    "%s não tem privilégio de tabela nem de coluna",
    async (papel) => {
      const [r] = await sql<{ tabela: boolean; coluna: boolean }>(
        `select has_table_privilege($1, 'public.family_messages', 'select, insert, update, delete') as tabela,
                has_any_column_privilege($1, 'public.family_messages', 'select, insert, update') as coluna`,
        [papel],
      );
      expect(r).toEqual({ tabela: false, coluna: false });
    },
  );

  it("RLS ligada; a única política nega anon e porta_autor (restritiva)", async () => {
    const [t] = await sql<{ rls: boolean }>(
      `select relrowsecurity as rls from pg_class where oid = 'public.family_messages'::regclass`,
    );
    expect(t.rls).toBe(true);
    const p = await sql<{ permissive: string; roles: string[]; qual: string }>(
      `select permissive, roles, qual from pg_policies where tablename = 'family_messages'`,
    );
    expect(p).toEqual([
      {
        permissive: "RESTRICTIVE",
        roles: ["anon", "porta_autor"],
        qual: "false",
      },
    ]);
  });

  it("um membro logado não lê nem com uma mensagem guardada", async () => {
    await sql(`insert into public.family_messages (book_id) values ($1)`, [
      livroA,
    ]);
    const r = await comoMembro(ana, `select * from public.family_messages`);
    expect(r.erro).toMatch(/permission denied/);
    await sql(`delete from public.family_messages`);
  });

  it.each(["qr_codes", "qr_consultas"])(
    "anon e porta_autor sem nada em %s",
    async (t) => {
      for (const papel of ["anon", "porta_autor"]) {
        const [r] = await sql<{ algum: boolean }>(
          `select has_table_privilege($1, $2, 'select, insert, update, delete')
               or has_any_column_privilege($1, $2, 'select, insert, update') as algum`,
          [papel, `public.${t}`],
        );
        expect(r.algum).toBe(false);
      }
    },
  );
});

describe("sorteio do código", () => {
  it("sempre 8 símbolos do alfabeto, sem repetir em 2000 sorteios", async () => {
    const r = await sql<{ c: string }>(
      `select privado.qr_sortear_codigo() as c from generate_series(1, 2000)`,
    );
    expect(r.every((x) => ALFABETO.test(x.c))).toBe(true);
    expect(new Set(r.map((x) => x.c)).size).toBe(2000);
    // os 31 símbolos aparecem (rejeição sem viés grosseiro)
    expect(new Set(r.map((x) => x.c).join("")).size).toBe(31);
  });

  it("nenhum cliente escolhe o código: criar_qr não recebe código", async () => {
    const s = await historia(livroA);
    const r = await comoMembro(ana, `select public.criar_qr($1, 'AAAAAAAA')`, [
      s,
    ]);
    expect(r.erro).toMatch(/does not exist/);
  });
});

describe("criar_qr", () => {
  it("só membro do livro, com plano ativo; anon não chama", async () => {
    const s = await historia(livroA);
    expect(await criarQr(beto, s)).toEqual({ erro: "sem_permissao" });
    const anon = await como(db, "anon", {}, (tx) =>
      tenta(tx, `select public.criar_qr($1)`, [s]),
    );
    expect(anon.erro).toMatch(/permission denied/);
  });

  it("história não marcada como pronta ou sem áudio: recusa", async () => {
    expect(await criarQr(ana, await historia(livroA, false))).toEqual({
      erro: "historia_nao_pronta",
    });
    expect(await criarQr(ana, await historia(livroA, true, false))).toEqual({
      erro: "historia_sem_audio",
    });
  });

  it("gravação inteira que também alimenta outra história: recusa", async () => {
    const s = await historia(livroA, true, false);
    const g = await gravacao(livroA, s, 1);
    const outra = await historia(livroA, true, false);
    await sql(
      `insert into public.story_recordings (story_id, recording_id, book_id, ordem, segmentos) values ($1, $2, $3, 1, '{1,2}')`,
      [outra, g, livroA],
    );
    expect(await criarQr(ana, s)).toEqual({
      erro: "historia_audio_compartilhado",
    });
  });

  it("cria uma vez, pede o recorte; o segundo pedido devolve o mesmo e não pede de novo", async () => {
    const s = await historia(livroA);
    const r1 = await criarQr(ana, s);
    const c = String(r1.linhas?.[0]?.codigo);
    expect(c).toMatch(ALFABETO);
    expect(r1.linhas?.[0]).toMatchObject({
      audio_pronto: false,
      pedir_audio: true,
    });
    const r2 = await criarQr(ana, s);
    expect(r2.linhas).toEqual([
      { codigo: c, audio_pronto: false, pedir_audio: false },
    ]);
  });

  it("plano vencido: não cria", async () => {
    const carla = await criarUsuario(db, "carla@exemplo.com");
    const livro = await ativarPlano(db, carla, "Zé");
    const s = await historia(livro);
    await sql(
      `update public.books set plano_ativado_em = now() - interval '13 months', plano_vence_em = now() - interval '1 day' where id = $1`,
      [livro],
    );
    expect(await criarQr(carla, s)).toEqual({ erro: "sem_permissao" });
  });
});

describe("recorte de áudio", () => {
  it("grava o recorte da fonte atual e avisa que o PDF pode sair", async () => {
    const s = await historia(livroA);
    const c = await qrDe(ana, s);
    expect((await recortar(c, livroA, s)).linhas).toEqual([
      { gravado: true, anterior: null },
    ]);
    expect((await criarQr(ana, s)).linhas?.[0]).toMatchObject({
      audio_pronto: true,
      pedir_audio: false,
    });
  });

  it("fonte velha (a história ganhou áudio no meio do corte) não grava", async () => {
    const s = await historia(livroA);
    const c = await qrDe(ana, s);
    const velha = await fonte(s);
    await gravacao(livroA, s, 2);
    const r = await servico(
      `select gravado from public.servico_qr_audio_pronto($1, $2, $3, 100)`,
      [c, `livros/${livroA}/${c}-${"a".repeat(12)}.m4a`, velha],
    );
    expect(r.linhas).toEqual([{ gravado: false }]);
  });

  it("recorte mais longo que a fala da história + folga é recusado", async () => {
    const s = await historia(livroA); // 120 s de fala
    const c = await qrDe(ana, s);
    expect(await recortar(c, livroA, s, 151)).toEqual({
      erro: "qr_recorte_longo",
    });
    expect((await recortar(c, livroA, s, 150)).linhas?.[0]).toMatchObject({
      gravado: true,
    });
  });

  it("recorte novo devolve o caminho do anterior, para apagar o arquivo velho", async () => {
    const s = await historia(livroA);
    const c = await qrDe(ana, s);
    await recortar(c, livroA, s);
    const [{ antes }] = await sql<{ antes: string }>(
      `select audio_caminho as antes from public.qr_codes where codigo = $1`,
      [c],
    );
    await sql(
      `update public.story_recordings set segmentos = '{1,2}' where story_id = $1`,
      [s],
    );
    expect((await recortar(c, livroA, s)).linhas).toEqual([
      { gravado: true, anterior: antes },
    ]);
  });

  it("caminho de outro livro é recusado pelo CHECK", async () => {
    const s = await historia(livroA);
    const c = await qrDe(ana, s);
    const r = await servico(
      `select public.servico_qr_audio_pronto($1, $2, $3, 100)`,
      [c, `livros/${livroB}/${c}-${"b".repeat(12)}.m4a`, await fonte(s)],
    );
    expect(r.erro).toMatch(/qr_codes_audio_do_livro/);
  });

  it("áudio acrescentado ainda fora do texto não entra na fonte", async () => {
    const s = await historia(livroA);
    const antes = await fonte(s);
    const g = crypto.randomUUID();
    await sql(
      `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes,
        duracao_s, upload, recebido_em, para_historia)
       values ($1, $2, 'upload', 'b.m4a', $3, 'audio/mp4', 100, 60, 'recebido', now(), $4)`,
      [g, livroA, `livros/${livroA}/audios/${g}.m4a`, s],
    );
    await sql(
      `insert into public.story_recordings (story_id, recording_id, book_id, ordem) values ($1, $2, $3, 2)`,
      [s, g, livroA],
    );
    expect(await fonte(s)).toBe(antes);
  });
});

describe("nunca apagado; desligar", () => {
  it("nem a chave secreta apaga, troca o código ou a história", async () => {
    const s = await historia(livroA);
    const c = await qrDe(ana, s);
    const outra = await historia(livroA);
    for (const q of [
      `delete from public.qr_codes where codigo = '${c}'`,
      `update public.qr_codes set codigo = 'JJJJ3333' where codigo = '${c}'`,
      `update public.qr_codes set story_id = '${outra}' where codigo = '${c}'`,
      `truncate public.qr_codes`,
    ]) {
      const r = await servico(q);
      expect(r.erro).toMatch(/qr_imutavel|permission denied/);
    }
  });

  it("o membro lê só o próprio livro, sem o caminho do recorte, e não escreve direto", async () => {
    const c = await qrDe(beto, await historia(livroB));
    const r = await comoMembro(ana, `select codigo from public.qr_codes`);
    expect(r.linhas?.map((x) => x.codigo)).not.toContain(c);
    const caminho = await comoMembro(
      ana,
      `select audio_caminho from public.qr_codes`,
    );
    expect(caminho.erro).toMatch(/permission denied/);
    const w = await comoMembro(
      ana,
      `insert into public.qr_codes (codigo, book_id, story_id) values ('MMMM2222', $1, $2)`,
      [livroA, await historia(livroA)],
    );
    expect(w.erro).toMatch(/permission denied/);
  });

  it("só o responsável desliga e religa; desligado não gera página nem toca", async () => {
    const s = await historia(livroA);
    const c = await qrDe(ana, s);
    await recortar(c, livroA, s);
    expect(
      await comoMembro(beto, `select public.desativar_qr($1, true)`, [c]),
    ).toEqual({ erro: "sem_permissao" });
    const cofa = await criarUsuario(db, "cofa@exemplo.com");
    await sql(
      `insert into public.book_members (book_id, user_id, papel) values ($1, $2, 'cofacilitador')`,
      [livroA, cofa],
    );
    expect(
      await comoMembro(cofa, `select public.desativar_qr($1, true)`, [c]),
    ).toEqual({ erro: "sem_permissao" });
    await comoMembro(ana, `select public.desativar_qr($1, true)`, [c]);
    expect(await criarQr(ana, s)).toEqual({ erro: "qr_desativado" });
    expect(await ouvir(c, chave(7))).toEqual({ estado: "desativado" });
    await comoMembro(ana, `select public.desativar_qr($1, false)`, [c]);
    expect((await ouvir(c, chave(7))).estado).toBe("ok");
  });
});

describe("servico_ouvir_qr (o player)", () => {
  it("anon e authenticated não chamam", async () => {
    for (const papel of ["anon", "authenticated"] as const) {
      const r = await como(db, papel, { sub: ana }, (tx) =>
        tenta(tx, `select public.servico_ouvir_qr('CCCC2222', $1)`, [chave(1)]),
      );
      expect(r.erro).toMatch(/permission denied/);
    }
  });

  it("estados: não encontrado, preparando, ok com título e ano", async () => {
    expect(await ouvir("NNNN2222", chave(1))).toEqual({
      estado: "nao_encontrado",
    });
    expect(await ouvir("nao-vale", chave(1))).toEqual({
      estado: "nao_encontrado",
    });
    const s = await historia(livroA);
    const c = await qrDe(ana, s); // criar_qr já reservou o pedido
    expect(await ouvir(c, chave(1))).toEqual({
      estado: "preparando",
      pedir_audio: false,
    });
    await recortar(c, livroA, s);
    const ok = await ouvir(c, chave(1));
    expect(ok).toMatchObject({ estado: "ok", titulo: "O trem", ano: 1962 });
    expect(String(ok.audio_caminho)).toMatch(
      new RegExp(`^livros/${livroA}/${c}-`),
    );
  });

  it("história mudou depois do recorte: preparando (nunca o áudio velho) e pede o novo", async () => {
    const s = await historia(livroA);
    const c = await qrDe(ana, s);
    await recortar(c, livroA, s);
    await sql(
      `update public.story_recordings set segmentos = '{3}' where story_id = $1`,
      [s],
    );
    expect(await ouvir(c, chave(2))).toEqual({
      estado: "preparando",
      pedir_audio: true,
    });
    expect(await ouvir(c, chave(2))).toEqual({
      estado: "preparando",
      pedir_audio: false,
    });
  });

  it("funciona com o plano vencido", async () => {
    const s = await historia(livroB);
    const c = await qrDe(beto, s);
    await recortar(c, livroB, s);
    await sql(
      `update public.books set plano_ativado_em = now() - interval '13 months', plano_vence_em = now() - interval '1 day' where id = $1`,
      [livroB],
    );
    expect((await ouvir(c, chave(3))).estado).toBe("ok");
  });

  it("10 erros por rede em 10 min: limite até para código válido; outra rede segue", async () => {
    const s = await historia(livroA);
    const c = await qrDe(ana, s);
    await recortar(c, livroA, s);
    const k = chave(99);
    for (let i = 0; i < 10; i++)
      expect((await ouvir("RRRR2222", k)).estado).toBe("nao_encontrado");
    expect((await ouvir(c, k)).estado).toBe("limite");
    expect((await ouvir(c, chave(100))).estado).toBe("ok");
  });

  it("acertos têm teto próprio (60 por minuto por rede)", async () => {
    const s = await historia(livroA);
    const c = await qrDe(ana, s);
    await recortar(c, livroA, s);
    const k = chave(200);
    const estados: string[] = [];
    for (let i = 0; i < 61; i++)
      estados.push(String((await ouvir(c, k)).estado));
    expect(estados.slice(0, 60).every((e) => e === "ok")).toBe(true);
    expect(estados[60]).toBe("limite");
  });

  it("teto global de erros fecha os erros de todas as redes", async () => {
    await sql(
      `insert into public.qr_consultas (chave, tipo, janela, n)
       values (repeat('0', 64), 'erro', date_bin('10 minutes', now(), timestamptz '2026-01-01'), 3000)
       on conflict (chave, tipo, janela) do update set n = 3000`,
    );
    expect((await ouvir("SSSS2222", chave(300))).estado).toBe("limite");
    await sql(`delete from public.qr_consultas where chave = repeat('0', 64)`);
  });

  it("chave que não é hash ou é a do balde global: recusa", async () => {
    expect((await ouvir("CCCC2222", "1.2.3.4")).erro).toMatch(/chave_invalida/);
    expect((await ouvir("CCCC2222", "0".repeat(64))).erro).toMatch(
      /chave_invalida/,
    );
  });
});

describe("servico_qr_tocou (a métrica)", () => {
  it("1 evento por código, rede e hora, só com ids", async () => {
    const s = await historia(livroA);
    const c = await qrDe(ana, s);
    const tocar = async (k: string) =>
      (await servico(`select public.servico_qr_tocou($1, $2) as r`, [c, k]))
        .linhas?.[0]?.r;
    expect(await tocar(chave(400))).toBe(true);
    expect(await tocar(chave(400))).toBe(false);
    expect(await tocar(chave(401))).toBe(true);
    const ev = await sql<{ detalhes: Record<string, string> }>(
      `select detalhes from public.events where acao = 'qr_tocou' and detalhes ->> 'story_id' = $1`,
      [s],
    );
    expect(ev).toHaveLength(2);
    expect(Object.keys(ev[0].detalhes)).toEqual(["story_id"]);
  });

  it("limpeza apaga contadores com mais de 2 h", async () => {
    await sql(
      `insert into public.qr_consultas (chave, tipo, janela) values ($1, 'erro', now() - interval '3 hours')`,
      [chave(500)],
    );
    const r = await servico(`select public.servico_qr_limpar_consultas() as n`);
    expect(Number(r.linhas?.[0]?.n)).toBeGreaterThanOrEqual(1);
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
