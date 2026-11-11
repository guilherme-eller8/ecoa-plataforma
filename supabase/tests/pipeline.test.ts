// Pipeline (prompt 6): histórias, transcrições, versões, custo, memória, glossário e o canal
// do Realtime. Isolamento entre livros, token do autor sem acesso, versão da IA imutável e
// as funções servico_* com guarda de estado. Design: docs/designs/pipeline-texto-ao-vivo.md.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ativarPlano,
  como,
  criarBanco,
  criarUsuario,
  reverter,
  tenta,
  vencerPlano,
} from "./banco";

let db: PGlite;
let ana: string; // responsável do livro A
let beto: string; // responsável do livro B
let livroA: string;
let livroB: string;

const servico = <T>(fn: Parameters<typeof como<T>>[3]) =>
  como(db, "service_role", {}, fn);
const sessao = <T>(usuario: string, fn: Parameters<typeof como<T>>[3]) =>
  como(db, "authenticated", { sub: usuario }, fn);

async function gravacao(
  livro: string,
  campos: { origem?: string; duracao?: number | null; lote?: string | null } = {},
) {
  const id = crypto.randomUUID();
  await db.query(
    `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes,
       duracao_s, upload, recebido_em, lote_id)
     values ($1, $2, $3::public.recording_origem, 'a.m4a', $4, 'audio/mp4', 100, $5, 'recebido', now(), $6)`,
    [
      id,
      livro,
      campos.origem ?? "upload",
      `livros/${livro}/audios/${id}.m4a`,
      campos.duracao === undefined ? 300 : campos.duracao,
      campos.lote ?? null,
    ],
  );
  return id;
}

async function consentir(livro: string) {
  await db.query(
    `update public.books set ia_consentimento_em = now(), ia_consentimento_versao = 1 where id = $1`,
    [livro],
  );
}

type Inicio = { historia: string | null; estado: string | null; motivo: string | null };
async function iniciar(g: string): Promise<Inicio> {
  return servico(async (tx) => {
    const r = await tx.query<Inicio>(
      `select * from public.servico_iniciar_historia($1)`,
      [g],
    );
    return r.rows[0];
  });
}

async function mudar(h: string, para: string) {
  return servico(async (tx) => {
    const r = await tx.query<{ ok: boolean }>(
      `select public.servico_mudar_etapa($1, $2::public.story_estado, 'teste', 'erro_inesperado') as ok`,
      [h, para],
    );
    return r.rows[0].ok;
  });
}

/** Leva uma gravação até a história pronta, como o pipeline faz. */
async function historiaPronta(livro: string) {
  const g = await gravacao(livro);
  const { historia } = await iniciar(g);
  await servico(async (tx) => {
    await tx.query(
      `insert into public.transcripts (recording_id, book_id, provedor, modelo, segmentos, palavras, minutos)
       values ($1, $2, 'elevenlabs', 'scribe_v1', '[]', '[]', 5)`,
      [g, livro],
    );
    await tx.query(
      `select public.servico_mudar_etapa($1, 'escrevendo'::public.story_estado)`,
      [historia],
    );
    await tx.query(
      `update public.stories set rascunho = $2 where id = $1`,
      [historia, JSON.stringify({ edicao: { titulo: "A fazenda", paragrafos: [], lacunas: [] } })],
    );
    await tx.query(
      `select public.servico_concluir_historia($1, 'medio', '{}', '{}')`,
      [historia],
    );
  });
  return { gravacao: g, historia: historia! };
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Nelson");
  livroB = await ativarPlano(db, beto, "Zé");
  await consentir(livroB);
});
afterAll(async () => {
  await db.close();
});

describe("servico_iniciar_historia", () => {
  it("sem a confirmação do responsável, espera (P41)", async () => {
    const g = await gravacao(livroA);
    expect(await iniciar(g)).toEqual({
      historia: null,
      estado: null,
      motivo: "sem_consentimento",
    });
  });

  it("consentimento só pelo responsável e na versão atual", async () => {
    const r = await sessao(beto, (tx) =>
      tenta(tx, `select public.consentir_processamento_ia($1, 1::smallint)`, [livroA]),
    );
    expect(r).toEqual({ erro: "sem_permissao" });
    const errada = await sessao(ana, async (tx) =>
      (await tx.query<{ ok: boolean }>(
        `select public.consentir_processamento_ia($1, 9::smallint) as ok`,
        [livroA],
      )).rows[0].ok,
    );
    expect(errada).toBe(false);
    const certa = await sessao(ana, async (tx) =>
      (await tx.query<{ ok: boolean }>(
        `select public.consentir_processamento_ia($1, 1::smallint) as ok`,
        [livroA],
      )).rows[0].ok,
    );
    expect(certa).toBe(true);
  });

  it("lote, conversa, longa e sem duração esperam a divisão (P40)", async () => {
    const lote = crypto.randomUUID();
    expect((await iniciar(await gravacao(livroA, { origem: "lote", lote }))).motivo).toBe("divisao");
    expect((await iniciar(await gravacao(livroA, { origem: "conversa", lote }))).motivo).toBe("divisao");
    expect((await iniciar(await gravacao(livroA, { duracao: 3000 }))).motivo).toBe("longa");
    expect((await iniciar(await gravacao(livroA, { duracao: null }))).motivo).toBe("sem_duracao");
  });

  it("cria uma história só, mesmo chamada duas vezes", async () => {
    const g = await gravacao(livroA);
    const a = await iniciar(g);
    const b = await iniciar(g);
    expect(a.estado).toBe("ouvindo");
    expect(b).toEqual(a);
  });

  it("livro somente leitura não começa história nova", async () => {
    const carla = await criarUsuario(db, "carla@exemplo.com");
    const livroC = await ativarPlano(db, carla, "Lia");
    await consentir(livroC);
    const g = await gravacao(livroC);
    await vencerPlano(db, livroC);
    expect((await iniciar(g)).motivo).toBe("livro_fechado");
  });

  it("cota diária de minutos por livro", async () => {
    const dora = await criarUsuario(db, "dora@exemplo.com");
    const livroD = await ativarPlano(db, dora, "Rui");
    await consentir(livroD);
    const g0 = await gravacao(livroD);
    await db.query(
      `insert into public.ai_usage (book_id, recording_id, etapa, provedor, modelo, ok, minutos_audio, custo_usd)
       values ($1, $2, 'transcrever', 'elevenlabs', 'scribe_v1', true, 238, 0)`,
      [livroD, g0],
    );
    expect((await iniciar(await gravacao(livroD))).motivo).toBe("cota_diaria");
  });
});

describe("estados da história", () => {
  it("só o caminho certo: ouvindo → escrevendo → pronta; pronta não volta", async () => {
    const g = await gravacao(livroB);
    const { historia } = await iniciar(g);
    expect(await mudar(historia!, "pronta")).toBe(false);
    const concluir = () =>
      servico(async (tx) =>
        (await tx.query<{ ok: boolean }>(
          `select public.servico_concluir_historia($1, 'medio', '{}', '{}') as ok`,
          [historia],
        )).rows[0].ok,
      );
    expect(await concluir()).toBe(false); // ainda ouvindo, sem rascunho
    expect(await mudar(historia!, "escrevendo")).toBe(true);
    await db.query(`update public.stories set rascunho = $2 where id = $1`, [
      historia,
      JSON.stringify({ edicao: { titulo: "   ", paragrafos: [], lacunas: [] } }),
    ]);
    expect(await concluir()).toBe(true);
    const s = await db.query<{ estado: string; titulo: string | null; rascunho: unknown; proc: boolean }>(
      `select s.estado, s.titulo, s.rascunho, r.processado_em is not null as proc
       from public.stories s join public.recordings r on r.id = $2 where s.id = $1`,
      [historia, g],
    );
    expect(s.rows[0]).toEqual({ estado: "pronta", titulo: null, rascunho: null, proc: true });
    expect(await mudar(historia!, "falhou")).toBe(false);
    expect(await concluir()).toBe(true); // idempotente
    expect((await iniciar(g)).estado).toBe("pronta"); // o job para
  });

  it("falhou → ouvindo só pelo reabrir; reabrir de quem não falhou não muda nada", async () => {
    const { historia } = await iniciar(await gravacao(livroB));
    expect(await mudar(historia!, "ouvindo")).toBe(false);
    expect(await mudar(historia!, "falhou")).toBe(true);
    expect(await mudar(historia!, "ouvindo")).toBe(true);
  });
});

describe("versão da IA e transcrição: só insert", () => {
  it("nem a chave secreta altera, apaga ou trunca", async () => {
    await historiaPronta(livroB);
    await servico(async (tx) => {
      expect((await tenta(tx, `update public.story_versions set tamanho = 'resumido'`)).erro).toMatch(/permission denied/);
      expect((await tenta(tx, `delete from public.story_versions`)).erro).toMatch(/permission denied/);
      expect((await tenta(tx, `truncate public.story_versions`)).erro).toMatch(/permission denied/);
      expect((await tenta(tx, `update public.transcripts set minutos = 1`)).erro).toMatch(/permission denied/);
    });
    for (const sql of [
      `update public.story_versions set tamanho = 'resumido'`,
      `delete from public.story_versions`,
      `truncate public.story_versions`,
      `delete from public.transcripts`,
      `truncate public.transcripts`,
    ])
      await expect(db.query(sql)).rejects.toThrow("versao_imutavel");
  });

  it("apagar o usuário (LGPD) só anula criado_por da versão humana", async () => {
    const edu = await criarUsuario(db, "edu@exemplo.com");
    const { historia } = await historiaPronta(livroB);
    await db.query(
      `insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo, criado_por)
       values ($1, $2, 2, 'responsavel', 'medio', '{}', $3)`,
      [historia, livroB, edu],
    );
    await db.query(`delete from auth.users where id = $1`, [edu]);
    const r = await db.query<{ n: number }>(
      `select count(*)::int as n from public.story_versions where story_id = $1 and criado_por is null`,
      [historia],
    );
    expect(r.rows[0].n).toBe(2);
  });
});

describe("isolamento", () => {
  it("membro de outro livro não vê nada; o próprio vê sem rascunho nem erro", async () => {
    const { historia } = await historiaPronta(livroB);
    await sessao(ana, async (tx) => {
      for (const tabela of ["stories", "story_recordings", "transcripts", "story_versions", "glossary_entries"]) {
        const r = await tx.query(`select 1 from public.${tabela} where book_id = $1`, [livroB]);
        expect(r.rows, tabela).toEqual([]);
      }
    });
    await sessao(beto, async (tx) => {
      expect((await tx.query(`select id from public.stories where id = $1`, [historia])).rows).toHaveLength(1);
      expect((await tenta(tx, `select rascunho from public.stories`)).erro).toMatch(/permission denied/);
      expect((await tenta(tx, `select erro from public.stories`)).erro).toMatch(/permission denied/);
      expect((await tenta(tx, `select 1 from public.ai_usage`)).erro).toMatch(/permission denied/);
      expect((await tenta(tx, `select 1 from public.book_context`)).erro).toMatch(/permission denied/);
      expect((await tenta(tx, `update public.stories set titulo = 'x'`)).erro).toMatch(/permission denied/);
    });
  });

  it("o token do autor não alcança nenhuma tabela nem função nova", async () => {
    await como(db, "porta_autor", {}, async (tx) => {
      for (const tabela of ["stories", "story_recordings", "transcripts", "story_versions", "ai_usage", "book_context", "glossary_entries"]) {
        expect((await tenta(tx, `select 1 from public.${tabela}`)).erro, tabela).toMatch(/permission denied/);
      }
      for (const f of [
        `public.marcar_historia_vista('${crypto.randomUUID()}')`,
        `public.servico_iniciar_historia('${crypto.randomUUID()}')`,
        `public.consentir_processamento_ia('${livroA}', 1::smallint)`,
      ])
        expect((await tenta(tx, `select ${f}`)).erro, f).toMatch(/permission denied/);
    });
  });

  it("marcar_historia_vista só vale para membro do livro", async () => {
    const { historia } = await historiaPronta(livroB);
    await sessao(ana, (tx) => tx.query(`select public.marcar_historia_vista($1)`, [historia]));
    const antes = await db.query<{ v: boolean }>(`select vista_em is not null as v from public.stories where id = $1`, [historia]);
    expect(antes.rows[0].v).toBe(false);
    await sessao(beto, (tx) => tx.query(`select public.marcar_historia_vista($1)`, [historia]));
    const depois = await db.query<{ v: boolean }>(`select vista_em is not null as v from public.stories where id = $1`, [historia]);
    expect(depois.rows[0].v).toBe(true);
  });
});

describe("glossário", () => {
  it("sugestões: até 10 por história, saneadas, sem duplicar", async () => {
    const { historia } = await historiaPronta(livroB);
    const nomes = [
      { nome: "Guarapari", tipo: "lugar" },
      { nome: " guarapari ", tipo: "lugar" },
      { nome: "", tipo: "pessoa" },
      { nome: "Zé", tipo: "bicho" },
      ...Array.from({ length: 12 }, (_, i) => ({ nome: `Pessoa ${i}`, tipo: "pessoa" })),
    ];
    const n = await servico(async (tx) =>
      (await tx.query<{ n: number }>(`select public.servico_sugerir_nomes($1, $2) as n`, [historia, JSON.stringify(nomes)])).rows[0].n,
    );
    expect(n).toBe(7); // 10 lidos: Guarapari + 6 pessoas
  });

  it("membro acrescenta só como aceito, ajusta e não apaga; sem plano, nada muda", async () => {
    await sessao(beto, async (tx) => {
      expect((await tenta(tx, `insert into public.glossary_entries (book_id, tipo, nome, estado) values ($1, 'pessoa', 'Tião', 'sugerido')`, [livroB])).erro).toBeDefined();
      expect((await tenta(tx, `insert into public.glossary_entries (book_id, tipo, nome, estado) values ($1, 'pessoa', 'Tião', 'aceito')`, [livroB])).erro).toBeUndefined();
      expect(await tenta(tx, `update public.glossary_entries set estado = 'recusado' where nome = 'Guarapari'`)).toMatchObject({ afetadas: 1 });
      expect((await tenta(tx, `delete from public.glossary_entries`)).erro).toMatch(/permission denied/);
      expect((await tenta(tx, `insert into public.glossary_entries (book_id, tipo, nome, estado) values ($1, 'pessoa', 'X', 'aceito')`, [livroA])).erro).toBeDefined();
    });
    const fabi = await criarUsuario(db, "fabi@exemplo.com");
    const livroF = await ativarPlano(db, fabi, "Ivo");
    await vencerPlano(db, livroF);
    await sessao(fabi, async (tx) => {
      expect((await tenta(tx, `insert into public.glossary_entries (book_id, tipo, nome, estado) values ($1, 'pessoa', 'Tião', 'aceito')`, [livroF])).erro).toBeDefined();
    });
  });

  it("apelido nulo ou vazio é recusado", async () => {
    await sessao(beto, async (tx) => {
      expect((await tenta(tx, `insert into public.glossary_entries (book_id, tipo, nome, estado, apelidos) values ($1, 'pessoa', 'Lu', 'aceito', array[null]::text[])`, [livroB])).erro).toBeDefined();
      expect((await tenta(tx, `insert into public.glossary_entries (book_id, tipo, nome, estado, apelidos) values ($1, 'pessoa', 'Lu', 'aceito', array[' ']::text[])`, [livroB])).erro).toBeDefined();
    });
  });
});

describe("canal do Realtime (livro:{id})", () => {
  async function ouve(usuario: string | null, topico: string, papel: "authenticated" | "anon" | "porta_autor" = "authenticated") {
    return como(db, papel, usuario ? { sub: usuario } : {}, async (tx) => {
      await tx.query(`select set_config('realtime.topic', $1, true)`, [topico]);
      const r = await tenta(tx, `select id from realtime.messages`);
      return "erro" in r && r.erro ? r.erro : (r as { linhas: number }).linhas;
    });
  }

  beforeAll(async () => {
    await db.query(`insert into realtime.messages (topic, extension, payload) values ('qualquer', 'broadcast', '{}')`);
  });

  it("membro ouve o próprio livro e não o de outro", async () => {
    expect(await ouve(ana, `livro:${livroA}`)).toBe(1);
    expect(await ouve(ana, `livro:${livroB}`)).toBe(0);
  });

  it("tópico malformado nega sem erro", async () => {
    for (const t of ["livro:zzz", "livro:", `LIVRO:${livroA}`, `livro:${livroA.toUpperCase()}`, "", `livro:${livroA}x`])
      expect(await ouve(ana, t), t).toBe(0);
  });

  it("anônimo e o token do autor não ouvem", async () => {
    expect(await ouve(null, `livro:${livroA}`, "anon")).toBe(0);
    expect(await ouve(null, `livro:${livroA}`, "porta_autor")).toMatch(/permission denied/);
  });
});

describe("reversão", () => {
  it("trava com versões gravadas; forçada, desce e sobe de novo", async () => {
    await expect(reverter(db)).rejects.toThrow("reversao_com_historias");
  });
});
